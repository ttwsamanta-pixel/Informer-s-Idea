import { submitContact } from '@/server/contact';
import { uploadImage, serveImage } from '@/server/media';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { databaseConfigured, query, execute } from '@/server/db';
import {
  checkOrigin,
  jsonBody,
  HttpError,
  rateLimit,
  requestIdentity,
  digest,
  appOrigin,
  audit,
} from '@/server/security';
import {
  currentUser,
  requireUser,
  login,
  logout,
  forgotPassword,
  resetPassword,
} from '@/server/auth';
import {
  listResource,
  saveResource,
  disableResource,
  localPath,
} from '@/server/resources';
import { catalog, blog, records, settings } from '@/server/content';
import { dashboard, recordEvent } from '@/server/analytics';
import {
  users,
  saveUser,
  deleteUser,
  readKeys,
  createKey,
  revokeKey,
  saveSettings,
} from '@/server/management';
import {
  connectGoogle,
  googleCallback,
  searchReport,
} from '@/server/search-console';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path;
  const route = path.join('/'),
    method = req.method,
    url = new URL(req.url);
  try {
    if (route === 'public/catalog' && method === 'GET')
      return respond(await catalog());
    if (route === 'public/blog' && method === 'GET')
      return respond(await blog());
    if (route === 'public/settings' && method === 'GET') {
      const config = await settings();
      return respond({ analyticsEnabled: Boolean(config.analyticsEnabled) });
    }
    if (route === 'public/ads' && method === 'GET' && !databaseConfigured())
      return respond([]);
    if (!databaseConfigured())
      throw new HttpError(
        503,
        'Backend setup is pending. Configure MySQL and run the database setup command.',
      );
    if (!['GET', 'HEAD'].includes(method)) checkOrigin(req);
    if (path[0] === 'media' && path.length === 2 && method === 'GET')
      return serveImage(path[1]);
    if (route === 'public/contact' && method === 'POST')
      return respond(await submitContact(req));
    if (route === 'admin/media' && method === 'POST')
      return respond(await uploadImage(req));
    if (route === 'auth/me' && method === 'GET')
      return respond(await currentUser());
    if (route === 'auth/login' && method === 'POST') {
      const b = z
        .object({
          email: z
            .email()
            .max(254)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(1).max(128),
        })
        .strict()
        .parse(await jsonBody(req));
      return respond(await login(req, b.email, b.password));
    }
    if (route === 'auth/logout' && method === 'POST')
      return respond(await logout());
    if (route === 'auth/forgot-password' && method === 'POST') {
      const b = z
        .object({
          email: z
            .email()
            .max(254)
            .transform((v) => v.toLowerCase()),
        })
        .strict()
        .parse(await jsonBody(req));
      return respond(await forgotPassword(req, b.email));
    }
    if (route === 'auth/reset-password' && method === 'POST') {
      await rateLimit('reset:' + requestIdentity(req), 10);
      const b = z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          password: z.string().min(12).max(128),
        })
        .strict()
        .parse(await jsonBody(req));
      return respond(await resetPassword(b.token, b.password));
    }
    if (route === 'analytics/event' && method === 'POST')
      return respond(await recordEvent(req, await jsonBody(req)));
    if (route === 'public/ads' && method === 'GET') {
      const now = new Date();
      return respond(
        (await records('ssinfo_ad_slots')).filter(
          (a) =>
            a.status === 'active' &&
            (!a.startDate || new Date(String(a.startDate)) <= now) &&
            (!a.endDate || new Date(String(a.endDate)) > now),
        ),
      );
    }
    if (path[0] === 'catalog' && method === 'GET') {
      const secret =
        req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
      const [key] = await query<{
        id: string;
        scopes: string | string[];
        rate_limit: number;
      }>(
        "SELECT k.id,k.scopes,k.rate_limit FROM ssinfo_api_keys k JOIN ssinfo_users u ON u.id=k.user_id WHERE k.token_hash=? AND k.revoked_at IS NULL AND u.status='active' AND u.deleted_at IS NULL",
        [digest(secret)],
      );
      const scopes =
        typeof key?.scopes === 'string' ? JSON.parse(key.scopes) : key?.scopes;
      if (
        !key ||
        !['tools', 'categories', 'blog'].includes(path[1]) ||
        !scopes.includes(path[1] + ':read')
      )
        throw new HttpError(403, 'Invalid key or scope.');
      await rateLimit('key:' + key.id, key.rate_limit, 60);
      await execute(
        'INSERT INTO ssinfo_api_usage (api_key_id,endpoint) VALUES (?,?)',
        [key.id, route],
      );
      return respond(
        path[1] === 'blog'
          ? await blog()
          : (await catalog())[path[1] as 'tools' | 'categories'],
      );
    }
    if (route === 'search-console/connect' && method === 'GET')
      return NextResponse.redirect(await connectGoogle());
    if (route === 'search-console/callback' && method === 'GET') {
      await googleCallback(url);
      return NextResponse.redirect(appOrigin() + '/admin/search-console');
    }
    if (route === 'search-console' && method === 'GET')
      return respond(await searchReport(url));
    if (path[0] !== 'admin') throw new HttpError(404, 'Endpoint not found.');
    const user = await requireUser();
    await rateLimit('admin:' + user.id, 300, 60);
    if (path[1] === 'resources') {
      if (method === 'GET') return respond(await listResource(path[2], url));
      if (method === 'POST' || method === 'PATCH')
        return respond(
          await saveResource(path[2], await jsonBody(req), path[3]),
        );
      if (method === 'DELETE' && path[3])
        return respond(await disableResource(path[2], path[3]));
    }
    if (path[1] === 'users') {
      if (method === 'DELETE' && path[2])
        return respond(await deleteUser(path[2]));
      if (method === 'GET') return respond(await users(url));
      if (method === 'POST' || method === 'PATCH')
        return respond(await saveUser(await jsonBody(req), path[2]));
    }
    if (path[1] === 'dashboard' && method === 'GET') {
      await requireUser('dashboard');
      return respond(await dashboard(url));
    }
    if (path[1] === 'settings') {
      await requireUser('settings');
      if (method === 'GET') return respond(await settings());
      if (method === 'PUT')
        return respond(await saveSettings(await jsonBody(req)));
    }
    if (path[1] === 'roles' && method === 'GET') {
      await requireUser('users');
      return respond(
        await query(
          'SELECT r.id,r.name,GROUP_CONCAT(rp.permission_id) AS permissions FROM ssinfo_roles r LEFT JOIN ssinfo_role_permissions rp ON rp.role_id=r.id GROUP BY r.id',
        ),
      );
    }
    if (path[1] === 'api-keys') {
      if (method === 'GET') return respond(await readKeys());
      if (method === 'POST')
        return respond(await createKey(await jsonBody(req)));
      if (method === 'DELETE' && path[2])
        return respond(await revokeKey(path[2]));
    }
    if (path[1] === 'redirects') {
      await requireUser('seo');
      if (method === 'GET')
        return respond(
          await query(
            'SELECT * FROM ssinfo_seo_redirects ORDER BY created_at DESC LIMIT 200',
          ),
        );
      if (method === 'DELETE') {
        await execute('DELETE FROM ssinfo_seo_redirects WHERE id=?', [path[2]]);
        return respond({ deleted: true });
      }
      if (method === 'POST') {
        const b = z
          .object({ source: localPath, destination: localPath })
          .strict()
          .parse(await jsonBody(req));
        if (
          b.source === b.destination ||
          /^\/(admin|api)(\/|$)/.test(b.source) ||
          /^\/(admin|api)(\/|$)/.test(b.destination)
        )
          throw new HttpError(400, 'Choose two different public paths.');
        const [loop] = await query(
          'SELECT id FROM ssinfo_seo_redirects WHERE source=? OR destination=?',
          [b.destination, b.source],
        );
        if (loop)
          throw new HttpError(
            400,
            'This would create a redirect chain or loop.',
          );
        await execute(
          'INSERT INTO ssinfo_seo_redirects (id,source,destination) VALUES (?,?,?)',
          [randomUUID(), b.source, b.destination],
        );
        await audit(user.id, 'create-redirect', b.source);
        return respond(b);
      }
    }
    if (
      ['subscriptions', 'payments', 'audit', 'api-usage'].includes(path[1]) &&
      method === 'GET'
    ) {
      await requireUser(
        path[1] === 'audit'
          ? 'settings'
          : path[1] === 'api-usage'
            ? 'api'
            : 'subscriptions',
      );
      const sql =
        path[1] === 'subscriptions'
          ? 'SELECT s.*,u.email,p.name AS plan FROM ssinfo_subscriptions s JOIN ssinfo_users u ON u.id=s.user_id JOIN ssinfo_plans p ON p.id=s.plan_id ORDER BY s.created_at DESC LIMIT 100'
          : path[1] === 'payments'
            ? 'SELECT * FROM ssinfo_payments ORDER BY created_at DESC LIMIT 100'
            : path[1] === 'audit'
              ? 'SELECT action,target,created_at FROM ssinfo_audit_logs ORDER BY created_at DESC LIMIT 100'
              : 'SELECT endpoint,COUNT(*) AS requests FROM ssinfo_api_usage GROUP BY endpoint';
      return respond(await query(sql));
    }
    if (path[1] === 'subscriptions' && method === 'POST') {
      await requireUser('subscriptions');
      const b = z
        .object({
          userId: z.uuid(),
          planId: z.string().max(100),
          status: z.enum(['active', 'cancelled', 'expired', 'pending']),
          startsAt: z.iso.datetime(),
          endsAt: z.iso.datetime(),
        })
        .strict()
        .parse(await jsonBody(req));
      if (b.endsAt <= b.startsAt)
        throw new HttpError(400, 'Expiry must follow start.');
      const id = randomUUID();
      await execute(
        'INSERT INTO ssinfo_subscriptions (id,user_id,plan_id,status,starts_at,ends_at) VALUES (?,?,?,?,?,?)',
        [
          id,
          b.userId,
          b.planId,
          b.status,
          new Date(b.startsAt),
          new Date(b.endsAt),
        ],
      );
      await audit(user.id, 'grant-subscription', id);
      return respond({ id });
    }
    throw new HttpError(405, 'Method not supported.');
  } catch (error) {
    if (error instanceof z.ZodError)
      return respond(
        null,
        400,
        error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '),
      );
    if (error instanceof HttpError)
      return respond(null, error.status, error.message);
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : 'INTERNAL';
    if (code === 'ER_DUP_ENTRY')
      return respond(null, 409, 'This email, slug or record already exists.');
    console.error(JSON.stringify({ event: 'api_error', route, code }));
    return respond(
      null,
      503,
      'The service is temporarily unavailable. Check database setup or server logs.',
    );
  }
}
function respond(data: unknown, status = 200, message?: string) {
  return NextResponse.json(
    message ? { success: false, message } : { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as PUT,
  handle as DELETE,
};
