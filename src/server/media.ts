import 'server-only';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { requireUser } from './auth';
import { execute, query } from './db';
import { audit, HttpError, rateLimit } from './security';

export async function uploadImage(req: Request) {
  const user = await requireUser();
  if (
    !user.permissions.some((p) =>
      ['*', 'blog', 'seo', 'tools', 'ads', 'settings'].includes(p),
    )
  )
    throw new HttpError(
      403,
      'Image uploads are not permitted for this account.',
    );
  await rateLimit('media:' + user.id, 30);
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'Choose an image.');
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 5 * 1024 * 1024) {
      await reader.cancel();
      throw new HttpError(413, 'Choose an image smaller than 5 MB.');
    }
    parts.push(value);
  }
  let image: Buffer;
  try {
    const input = Buffer.concat(parts);
    const metadata = await sharp(input, {
      limitInputPixels: 25000000,
    }).metadata();
    if (!['jpeg', 'png', 'webp', 'gif', 'avif'].includes(metadata.format || ''))
      throw new Error('Unsupported image');
    image = await sharp(input, { limitInputPixels: 25000000 })
      .rotate()
      .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      'Use a valid PNG, JPG, WebP, GIF or AVIF image, up to 25 megapixels.',
    );
  }
  if (image.length > 3 * 1024 * 1024)
    throw new HttpError(
      413,
      'The optimized image is too large. Choose a smaller image.',
    );
  const id = randomUUID();
  await execute(
    'INSERT INTO ssinfo_media (id,mime,bytes,created_by) VALUES (?,?,?,?)',
    [id, 'image/webp', image, user.id],
  );
  await audit(user.id, 'upload-image', 'media:' + id);
  return { url: '/api/v1/media/' + id };
}
export async function serveImage(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(404, 'Image not found.');
  const [row] = await query<{ mime: string; bytes: Buffer }>(
    'SELECT mime,bytes FROM ssinfo_media WHERE id=?',
    [id],
  );
  if (!row) throw new HttpError(404, 'Image not found.');
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
