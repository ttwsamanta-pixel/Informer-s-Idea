import 'server-only';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { resources } from '@/config/admin';
import { tools } from '@/config/tools';
import { query, execute, transaction } from './db';
import { requireUser } from './auth';
import { audit, HttpError } from './security';
import { unpack, type RecordRow } from './content';
export const localPath = z
  .string()
  .max(190)
  .regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/);
const slugSchema = z
  .string()
  .min(1)
  .max(190)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const safeURL = z
  .string()
  .max(2048)
  .refine((s) => !s || s.startsWith('https://'), 'Use an HTTPS URL.');
export async function listResource(key: string, url: URL) {
  const r = Object.hasOwn(resources, key) ? resources[key] : undefined;
  if (!r) throw new HttpError(404, 'Resource not found.');
  await requireUser(r.permission);
  const page = Math.max(
      1,
      Math.min(10000, Math.floor(Number(url.searchParams.get('page'))) || 1),
    ),
    q = (url.searchParams.get('q') || '').slice(0, 100),
    status = url.searchParams.get('status');
  const where = 'WHERE name LIKE ?' + (status ? ' AND status=?' : '');
  const values: unknown[] = ['%' + q + '%', ...(status ? [status] : [])];
  const [count] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${r.table} ${where}`,
    values,
  );
  const rows = await query<RecordRow>(
    `SELECT * FROM ${r.table} ${where} ORDER BY updated_at DESC LIMIT 50 OFFSET ${(page - 1) * 50}`,
    values,
  );
  return { items: rows.map(unpack), total: count.total, page };
}
export async function saveResource(key: string, body: unknown, id?: string) {
  const r = Object.hasOwn(resources, key) ? resources[key] : undefined;
  if (!r) throw new HttpError(404, 'Resource not found.');
  const user = await requireUser(r.permission);
  const shape: Record<string, z.ZodType> = {
    name: z.string().trim().min(1).max(190),
    slug: key === 'seo' ? localPath : slugSchema,
    status: z.enum(r.statuses as [string, ...string[]]),
  };
  for (const f of r.fields) {
    if (shape[f.key]) continue;
    shape[f.key] =
      f.type === 'checkbox'
        ? z.boolean().default(false)
        : f.type === 'number'
          ? z.coerce.number().min(0).max(1000000).default(0)
          : [
                'canonical',
                'image',
                'destination',
                'ogImage',
                'featuredImage',
              ].includes(f.key)
            ? safeURL.default('')
            : f.type === 'select'
              ? z
                  .enum(f.options as [string, ...string[]])
                  .default(f.options![0])
              : z
                  .string()
                  .max(f.type === 'textarea' ? 100000 : 2048)
                  .default('');
  }
  const data = z.object(shape).strict().parse(body) as Record<string, unknown>;
  for (const field of ['publishDate', 'startDate', 'endDate'])
    if (data[field] && !Number.isFinite(Date.parse(String(data[field]))))
      throw new HttpError(400, 'Enter a valid date.');
  if (
    data.startDate &&
    data.endDate &&
    String(data.startDate) > String(data.endDate)
  )
    throw new HttpError(400, 'End date must follow start date.');
  if (key === 'posts' && data.status === 'scheduled' && !data.publishDate)
    throw new HttpError(400, 'Scheduled posts require a publish date.');
  if (key === 'tools') {
    if (!tools.some((t) => t.id === data.processorId))
      throw new HttpError(
        400,
        'Choose an existing processor ID. New processing engines require code.',
      );
    const [category] = await query(
      'SELECT id FROM ssinfo_tool_categories WHERE id=?',
      [data.category],
    );
    if (!category) throw new HttpError(400, 'Category does not exist.');
  }
  if (
    key === 'categories' &&
    [
      'admin',
      'api',
      'tools',
      'blog',
      'all-tools',
      'about',
      'contact',
      'privacy-policy',
      'terms-of-use',
      'disclaimer',
    ].includes(String(data.slug))
  )
    throw new HttpError(400, 'This path is reserved.');
  const recordId = id || randomUUID();
  await transaction(async (c) => {
    const [old] = id
      ? await query<RecordRow>(
          `SELECT * FROM ${r.table} WHERE id=? FOR UPDATE`,
          [id],
          c,
        )
      : [];
    if (id && !old) throw new HttpError(404, 'Record not found.');
    if (
      old &&
      old.slug !== data.slug &&
      ['tools', 'categories', 'posts'].includes(key)
    ) {
      const prefix =
        key === 'tools' ? '/tools/' : key === 'posts' ? '/blog/' : '/';
      const destination = prefix + data.slug,
        source = prefix + old.slug;
      // Remove reverse redirect when restoring a previous slug, then flatten chains.
      await execute(
        'DELETE FROM ssinfo_seo_redirects WHERE source=?',
        [destination],
        c,
      );
      await execute(
        'UPDATE ssinfo_seo_redirects SET destination=? WHERE destination=?',
        [destination, source],
        c,
      );
      await execute(
        'INSERT INTO ssinfo_seo_redirects (id,source,destination) VALUES (?,?,?) ON DUPLICATE KEY UPDATE destination=VALUES(destination)',
        [randomUUID(), source, destination],
        c,
      );
    }
    if (id)
      await execute(
        `UPDATE ${r.table} SET slug=?,name=?,status=?,data=? WHERE id=?`,
        [data.slug, data.name, data.status, JSON.stringify(data), id],
        c,
      );
    else
      await execute(
        `INSERT INTO ${r.table} (id,slug,name,status,data) VALUES (?,?,?,?,?)`,
        [recordId, data.slug, data.name, data.status, JSON.stringify(data)],
        c,
      );
    if (key === 'tools') {
      await execute(
        'DELETE FROM ssinfo_tool_category_mapping WHERE tool_id=?',
        [recordId],
        c,
      );
      await execute(
        'INSERT INTO ssinfo_tool_category_mapping (tool_id,category_id) VALUES (?,?)',
        [recordId, data.category],
        c,
      );
    }
  });
  await audit(user.id, id ? 'update' : 'create', key + ':' + recordId);
  return { id: recordId, ...data };
}
export async function disableResource(key: string, id: string) {
  const r = Object.hasOwn(resources, key) ? resources[key] : undefined;
  if (!r) throw new HttpError(404, 'Resource not found.');
  const user = await requireUser(r.permission);
  await execute(`UPDATE ${r.table} SET status=? WHERE id=?`, [
    key === 'posts' ? 'draft' : 'inactive',
    id,
  ]);
  await audit(user.id, 'disable', key + ':' + id);
  return { message: 'Record unpublished / disabled.' };
}
