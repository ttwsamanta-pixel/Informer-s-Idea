import 'server-only';
import mysql, { type RowDataPacket, type PoolConnection } from 'mysql2/promise';

export const databaseConfigured = () =>
  Boolean(
    process.env.DATABASE_HOST &&
    process.env.DATABASE_NAME &&
    process.env.DATABASE_USER,
  );
const globalDB = globalThis as unknown as { ideaPool?: mysql.Pool };
export function pool() {
  if (!databaseConfigured()) throw new Error('DATABASE_NOT_CONFIGURED');
  return (globalDB.ideaPool ??= mysql.createPool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
    queueLimit: 50,
    waitForConnections: true,
    connectTimeout: 5000,
    timezone: 'Z',
    dateStrings: true,
    charset: 'utf8mb4',
    ...(process.env.DATABASE_SSL === 'true'
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  }));
}
export async function query<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
  connection?: PoolConnection,
): Promise<T[]> {
  const [rows] = await (connection || pool()).execute<RowDataPacket[]>(
    sql,
    values as Parameters<mysql.Pool['execute']>[1],
  );
  return rows as T[];
}
export async function execute(
  sql: string,
  values: unknown[] = [],
  connection?: PoolConnection,
) {
  return (connection || pool()).execute(
    sql,
    values as Parameters<mysql.Pool['execute']>[1],
  );
}
export async function transaction<T>(fn: (c: PoolConnection) => Promise<T>) {
  const c = await pool().getConnection();
  try {
    await c.beginTransaction();
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
}
