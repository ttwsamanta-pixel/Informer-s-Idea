import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireUser } from './auth';
import { query, execute, transaction } from './db';
import { audit, hashPassword, HttpError, token, digest } from './security';
export async function users(url: URL) {
  await requireUser('users');
  const q = (url.searchParams.get('q') || '').slice(0, 100);
  return query(
    'SELECT u.id,u.name,u.email,u.status,u.created_at,GROUP_CONCAT(ur.role_id) AS roles FROM ssinfo_users u LEFT JOIN ssinfo_user_roles ur ON ur.user_id=u.id WHERE u.deleted_at IS NULL AND (u.name LIKE ? OR u.email LIKE ?) GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100',
    ['%' + q + '%', '%' + q + '%'],
  );
}
export async function saveUser(body: unknown, id?: string) {
  const actor = await requireUser('users');
  const d = z
    .object({
      name: z.string().min(1).max(120),
      email: z
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(12).max(128).optional(),
      status: z.enum(['active', 'inactive']),
      role: z.string().max(64),
    })
    .strict()
    .parse(body);
  if (!id && !d.password)
    throw new HttpError(400, 'New accounts require a password.');
  if (!actor.permissions.includes('*'))
    throw new HttpError(
      403,
      'Only a super administrator can manage accounts and roles.',
    );
  if (id === actor.id && (d.status !== 'active' || d.role !== 'Super Admin'))
    throw new HttpError(
      400,
      'You cannot remove your own administrator access.',
    );
  const [role] = await query('SELECT id FROM ssinfo_roles WHERE id=?', [d.role]);
  if (!role) throw new HttpError(400, 'Unknown role.');
  const recordId = id || randomUUID(),
    hash = d.password ? await hashPassword(d.password) : null;
  await transaction(async (c) => {
    if (id) {
      const [existing] = await query(
        'SELECT id FROM ssinfo_users WHERE id=? FOR UPDATE',
        [id],
        c,
      );
      if (!existing) throw new HttpError(404, 'User not found.');
      await execute(
        'UPDATE ssinfo_users SET name=?,email=?,status=? WHERE id=?',
        [d.name, d.email, d.status, id],
        c,
      );
      if (hash)
        await execute(
          'UPDATE ssinfo_users SET password_hash=? WHERE id=?',
          [hash, id],
          c,
        );
      await execute('DELETE FROM ssinfo_sessions WHERE user_id=?', [id], c);
    } else
      await execute(
        'INSERT INTO ssinfo_users (id,name,email,password_hash,status) VALUES (?,?,?,?,?)',
        [recordId, d.name, d.email, hash, d.status],
        c,
      );
    await execute('DELETE FROM ssinfo_user_roles WHERE user_id=?', [recordId], c);
    await execute(
      'INSERT INTO ssinfo_user_roles (user_id,role_id) VALUES (?,?)',
      [recordId, d.role],
      c,
    );
  });
  await audit(actor.id, 'save-user', recordId);
  return { id: recordId };
}
export async function readKeys() {
  const user = await requireUser('api');
  return query(
    'SELECT id,name,scopes,rate_limit,revoked_at,created_at FROM ssinfo_api_keys WHERE user_id=?',
    [user.id],
  );
}
export async function createKey(body: unknown) {
  const user = await requireUser('api');
  const d = z
    .object({
      name: z.string().min(1).max(120),
      scopes: z
        .array(z.enum(['tools:read', 'categories:read', 'blog:read']))
        .min(1),
      rateLimit: z.number().int().min(1).max(120),
    })
    .strict()
    .parse(body);
  const secret = 'ii_' + token(),
    id = randomUUID();
  await execute(
    'INSERT INTO ssinfo_api_keys (id,user_id,name,token_hash,scopes,rate_limit) VALUES (?,?,?,?,?,?)',
    [
      id,
      user.id,
      d.name,
      digest(secret),
      JSON.stringify(d.scopes),
      d.rateLimit,
    ],
  );
  await audit(user.id, 'create-api-key', id);
  return {
    id,
    key: secret,
    message: 'Copy this key now. It will not be shown again.',
  };
}
export async function revokeKey(id: string) {
  const user = await requireUser('api');
  await execute(
    'UPDATE ssinfo_api_keys SET revoked_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?',
    [id, user.id],
  );
  await audit(user.id, 'revoke-api-key', id);
  return { revoked: true };
}
export async function saveSettings(body: unknown) {
  const user = await requireUser('settings');
  const d = z
    .object({
      siteTitle: z.string().min(1).max(190),
      description: z.string().max(500),
      analyticsEnabled: z.boolean(),
      allowIndexing: z.boolean(),
      retentionDays: z.number().int().min(7).max(365),
      ogImage: z
        .string()
        .max(2048)
        .refine((v) => !v || v.startsWith('https://'))
        .default(''),
    })
    .strict()
    .parse(body);
  if (d.analyticsEnabled && !process.env.ANALYTICS_HASH_SECRET)
    throw new HttpError(
      400,
      'Set ANALYTICS_HASH_SECRET on the server before enabling analytics.',
    );
  await execute(
    "INSERT INTO ssinfo_site_settings (id,data) VALUES ('general',?) ON DUPLICATE KEY UPDATE data=VALUES(data)",
    [JSON.stringify(d)],
  );
  await audit(user.id, 'update-settings', 'general');
  return d;
}
