import 'server-only';
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import { promisify } from 'node:util';
import { query, execute } from './db';
const scrypt = promisify(scryptCallback);
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const token = () => randomBytes(32).toString('hex');
export const digest = (s: string) =>
  createHash('sha256').update(s).digest('hex');
export function appOrigin() {
  return new URL(
    process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000',
  ).origin;
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [algo, salt, hex] = stored.split(':');
  if (algo !== 'scrypt' || !salt || !hex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function checkOrigin(req: Request) {
  if (req.headers.get('origin') !== appOrigin())
    throw new HttpError(
      403,
      'This action must be submitted from this website.',
    );
}
export async function jsonBody(req: Request) {
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(415, 'Send application/json.');
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'A JSON body is required.');
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 262144) {
      await reader.cancel();
      throw new HttpError(413, 'Request too large.');
    }
    parts.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
// MySQL-backed windows work across Node workers. Raw IPs are never stored.
export async function rateLimit(key: string, limit: number, seconds = 900) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const id = digest(key + ':' + window);
  await execute(
    'INSERT INTO ssinfo_rate_limits (id, hits, expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE hits=hits+1',
    [id, seconds],
  );
  const [row] = await query<{ hits: number }>(
    'SELECT hits FROM ssinfo_rate_limits WHERE id=?',
    [id],
  );
  if (row.hits > limit)
    throw new HttpError(429, 'Too many requests. Please try again later.');
}
export function requestIdentity(req: Request) {
  // Enable only when the hosting proxy overwrites this header.
  const header = process.env.TRUSTED_IP_HEADER;
  return header
    ? (req.headers.get(header) || 'unknown').split(',')[0].trim()
    : 'shared';
}
export async function audit(
  userId: string | null,
  action: string,
  target: string,
) {
  await execute(
    'INSERT INTO ssinfo_audit_logs (user_id,action,target) VALUES (?,?,?)',
    [userId, action, target],
  );
}
function encryptionKey() {
  const key = Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY || '', 'hex');
  if (key.length !== 32)
    throw new HttpError(503, 'Integration encryption is not configured.');
  return key;
}
export function seal(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  return [
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    encrypted.toString('hex'),
  ].join('.');
}
export function unseal(text: string) {
  const [iv, tag, data] = text.split('.');
  const cipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(iv, 'hex'),
  );
  cipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([
    cipher.update(Buffer.from(data, 'hex')),
    cipher.final(),
  ]).toString('utf8');
}
