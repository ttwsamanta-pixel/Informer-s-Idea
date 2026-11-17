import 'server-only';
import { cookies } from 'next/headers';
import { execute, query, transaction } from './db';
import {
  digest,
  HttpError,
  token,
  verifyPassword,
  hashPassword,
  audit,
  rateLimit,
  requestIdentity,
  appOrigin,
} from './security';
import nodemailer from 'nodemailer';
export const sessionCookie = 'idea_session';
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}
export async function currentUser(): Promise<AdminUser | null> {
  const value = (await cookies()).get(sessionCookie)?.value;
  if (!value) return null;
  const [user] = await query<{ id: string; name: string; email: string }>(
    `SELECT u.id,u.name,u.email FROM ssinfo_sessions s JOIN ssinfo_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND u.status='active' AND u.deleted_at IS NULL`,
    [digest(value)],
  );
  if (!user) return null;
  const rows = await query<{ role: string; permission: string | null }>(
    `SELECT r.name AS role,p.name AS permission FROM ssinfo_user_roles ur JOIN ssinfo_roles r ON r.id=ur.role_id LEFT JOIN ssinfo_role_permissions rp ON rp.role_id=r.id LEFT JOIN ssinfo_permissions p ON p.id=rp.permission_id WHERE ur.user_id=?`,
    [user.id],
  );
  return {
    ...user,
    roles: [...new Set(rows.map((r) => r.role))],
    permissions: [
      ...new Set(rows.flatMap((r) => (r.permission ? [r.permission] : []))),
    ],
  };
}
export async function requireUser(permission?: string) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Please sign in.');
  if (
    permission &&
    !user.permissions.includes(permission) &&
    !user.permissions.includes('*')
  )
    throw new HttpError(403, 'You do not have permission for this action.');
  return user;
}
export async function login(req: Request, email: string, password: string) {
  await rateLimit('login-ip:' + requestIdentity(req), 40);
  await rateLimit('login-email:' + email, 10);
  const [user] = await query<{
    id: string;
    password_hash: string;
    status: string;
  }>(
    'SELECT id,password_hash,status FROM ssinfo_users WHERE email=? AND deleted_at IS NULL',
    [email],
  );
  const dummy = 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64);
  const valid = await verifyPassword(password, user?.password_hash || dummy);
  if (!valid || user?.status !== 'active')
    throw new HttpError(401, 'Email or password is incorrect.');
  const value = token();
  await execute(
    'INSERT INTO ssinfo_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR))',
    [digest(value), user.id],
  );
  (await cookies()).set(sessionCookie, value, {
    httpOnly: true,
    secure: appOrigin().startsWith('https:'),
    sameSite: 'lax',
    path: '/',
    maxAge: 43200,
  });
  await audit(user.id, 'login', 'session');
  return { message: 'Signed in.' };
}
export async function logout() {
  const jar = await cookies();
  const value = jar.get(sessionCookie)?.value;
  if (value)
    await execute('DELETE FROM ssinfo_sessions WHERE token_hash=?', [digest(value)]);
  jar.delete(sessionCookie);
  return { message: 'Signed out.' };
}
export async function forgotPassword(req: Request, email: string) {
  await rateLimit('forgot:' + requestIdentity(req), 10);
  await rateLimit('forgot-email:' + email, 3, 3600);
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM)
    throw new HttpError(
      503,
      'Password reset email is not configured. Contact the site administrator.',
    );
  const [user] = await query<{ id: string }>(
    "SELECT id FROM ssinfo_users WHERE email=? AND status='active' AND deleted_at IS NULL",
    [email],
  );
  if (user) {
    const value = token();
    await execute(
      'INSERT INTO ssinfo_password_resets (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))',
      [digest(value), user.id],
    );
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Reset your Informer's Idea password",
      text: `Reset your password within 30 minutes: ${appOrigin()}/admin/reset-password?token=${value}`,
    });
  }
  return {
    message: 'If an active account matches, a reset link has been sent.',
  };
}
export async function resetPassword(value: string, password: string) {
  const hash = await hashPassword(password);
  await transaction(async (c) => {
    const [reset] = await query<{ user_id: string }>(
      'SELECT user_id FROM ssinfo_password_resets WHERE token_hash=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE',
      [digest(value)],
      c,
    );
    if (!reset)
      throw new HttpError(
        400,
        'This reset link has expired or has already been used.',
      );
    await execute(
      'UPDATE ssinfo_users SET password_hash=? WHERE id=?',
      [hash, reset.user_id],
      c,
    );
    await execute(
      'DELETE FROM ssinfo_password_resets WHERE user_id=?',
      [reset.user_id],
      c,
    );
    await execute('DELETE FROM ssinfo_sessions WHERE user_id=?', [reset.user_id], c);
  });
  return { message: 'Password updated. Please sign in.' };
}
