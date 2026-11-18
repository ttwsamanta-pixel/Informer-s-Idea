import { information } from '../src/config/information';
import { textContent } from '../src/lib/content-html';
import { loadEnvConfig } from '@next/env';
import mysql from 'mysql2/promise';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID, randomBytes, scryptSync, createHash } from 'node:crypto';
import { tools } from '../src/config/tools';
import { categories } from '../src/config/categories';
import { articles } from '../src/config/articles';
import { permissionNames } from '../src/config/admin';
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_NAME || !process.env.DATABASE_USER)
    throw new Error(
      'Configure DATABASE_* in .env.local or the server environment first.',
    );
  const c = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    charset: 'utf8mb4',
    ...(process.env.DATABASE_SSL === 'true'
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  });
  try {
    const [lock] = await c.query<mysql.RowDataPacket[]>(
      "SELECT GET_LOCK('ssinfo_migrations',30) AS acquired",
    );
    if (lock[0].acquired !== 1)
      throw new Error('Another migration is running.');
    await c.execute(
      'CREATE TABLE IF NOT EXISTS ssinfo_schema_migrations (name VARCHAR(190) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
    );
    for (const name of (await readdir('database/migrations'))
      .filter((n) => n.endsWith('.sql'))
      .sort()) {
      const sql = await readFile('database/migrations/' + name, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const [rows] = await c.execute<mysql.RowDataPacket[]>(
        'SELECT checksum FROM ssinfo_schema_migrations WHERE name=?',
        [name],
      );
      if (rows.length) {
        if (rows[0].checksum !== checksum)
          throw new Error('Applied migration changed: ' + name);
        continue;
      }
      for (const statement of sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await c.query(statement);
      await c.execute(
        'INSERT INTO ssinfo_schema_migrations (name,checksum) VALUES (?,?)',
        [name, checksum],
      );
      console.log('Applied', name);
    }
    await c.query("SELECT RELEASE_LOCK('ssinfo_migrations')");
    for (const p of ['*', ...permissionNames])
      await c.execute(
        'INSERT IGNORE INTO ssinfo_permissions (id,name) VALUES (?,?)',
        [p, p],
      );
    const roles: Record<string, string[]> = {
      'Super Admin': ['*'],
      Admin: permissionNames.filter((p) => p !== 'users' && p !== 'settings'),
      Editor: ['dashboard', 'blog'],
      'SEO Manager': ['dashboard', 'seo', 'search-console'],
      Analyst: ['dashboard', 'analytics', 'search-console'],
      'Ad Manager': ['dashboard', 'ads'],
      Support: ['dashboard'],
    };
    for (const [role, permissions] of Object.entries(roles)) {
      await c.execute(
        'INSERT IGNORE INTO ssinfo_roles (id,name) VALUES (?,?)',
        [role, role],
      );
      for (const p of permissions)
        await c.execute(
          'INSERT IGNORE INTO ssinfo_role_permissions (role_id,permission_id) VALUES (?,?)',
          [role, p],
        );
    }
    for (const cat of categories)
      await c.execute(
        "INSERT IGNORE INTO ssinfo_tool_categories (id,slug,name,status,data) VALUES (?,?,?,'active',?)",
        [
          cat.id,
          cat.slug,
          cat.name,
          JSON.stringify({ ...cat, sortOrder: categories.indexOf(cat) }),
        ],
      );
    for (const t of tools) {
      await c.execute(
        "INSERT IGNORE INTO ssinfo_tools (id,slug,name,status,data) VALUES (?,?,?,'active',?)",
        [
          t.id,
          t.slug,
          t.name,
          JSON.stringify({
            ...t,
            processorId: t.id,
            sortOrder: tools.indexOf(t),
            keywords: t.keywords.join(', '),
          }),
        ],
      );
      await c.execute(
        'INSERT IGNORE INTO ssinfo_tool_category_mapping (tool_id,category_id) VALUES (?,?)',
        [t.id, t.category],
      );
    }
    for (const a of articles)
      await c.execute(
        "INSERT IGNORE INTO ssinfo_blog_posts (id,slug,name,status,data) VALUES (?,?,?,'published',?)",
        [
          a.slug,
          a.slug,
          a.title,
          JSON.stringify({
            ...a,
            content: a.sections.map((s) => s.join('\n')).join('\n\n'),
          }),
        ],
      );
    await c.execute(
      "INSERT IGNORE INTO ssinfo_site_settings (id,data) VALUES ('general',?)",
      [
        JSON.stringify({
          siteTitle: "Informer's Idea",
          description: 'Smart tools for a smarter you.',
          analyticsEnabled: false,
          retentionDays: 90,
          allowIndexing: true,
        }),
      ],
    );
    const pageSeeds = [
      ...Object.entries(information).map(([slug, p]) => ({
        path: '/' + slug,
        name: p.title,
        data: {
          pageTitle: p.title,
          description: p.description,
          content: p.sections
            .map(([h, t]) => `<h2>${h}</h2>${textContent(t)}`)
            .join(''),
          contentFormat: 'html',
        },
      })),
      {
        path: '/contact',
        name: 'Contact',
        data: {
          pageTitle: 'Have an idea? We are listening.',
          description: 'Get in touch with Informers Idea.',
          content: '',
        },
      },
      { path: '/', name: 'Home', data: {} },
      { path: '/all-tools', name: 'All Tools', data: {} },
      { path: '/blog', name: 'Blog', data: {} },
      ...categories.map((c) => ({
        path: '/' + c.slug,
        name: c.name,
        data: {},
      })),
      ...tools.map((t) => ({
        path: '/tools/' + t.slug,
        name: t.name,
        data: {},
      })),
    ];
    for (const p of pageSeeds)
      await c.execute(
        "INSERT IGNORE INTO ssinfo_seo_pages (id,slug,name,status,data) VALUES (?,?,?,'active',?)",
        [p.path, p.path, p.name, JSON.stringify(p.data)],
      );
    if (process.argv.includes('--admin')) {
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
        password = process.env.ADMIN_PASSWORD;
      if (!email || !password || password.length < 12)
        throw new Error(
          'Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in your private environment.',
        );
      const [existing] = await c.execute<mysql.RowDataPacket[]>(
        'SELECT id FROM ssinfo_users WHERE email=?',
        [email],
      );
      if (existing.length)
        throw new Error(
          'Account already exists; bootstrap does not overwrite passwords or roles.',
        );
      const id = randomUUID(),
        salt = randomBytes(16).toString('hex'),
        hash =
          'scrypt:' +
          salt +
          ':' +
          scryptSync(password, salt, 64).toString('hex');
      await c.beginTransaction();
      try {
        await c.execute(
          'INSERT INTO ssinfo_users (id,name,email,password_hash) VALUES (?,?,?,?)',
          [id, 'Administrator', email, hash],
        );
        await c.execute(
          "INSERT INTO ssinfo_user_roles (user_id,role_id) VALUES (?,'Super Admin')",
          [id],
        );
        await c.commit();
      } catch (error) {
        await c.rollback();
        throw error;
      }
      console.log(
        'First administrator created. Remove ADMIN_PASSWORD from the environment.',
      );
    }
    if (process.argv.includes('--cleanup')) {
      await c.execute(
        'DELETE FROM ssinfo_sessions WHERE expires_at<UTC_TIMESTAMP()',
      );
      await c.execute(
        'DELETE FROM ssinfo_password_resets WHERE expires_at<UTC_TIMESTAMP()',
      );
      await c.execute(
        'DELETE FROM ssinfo_rate_limits WHERE expires_at<UTC_TIMESTAMP()',
      );
      await c.execute(
        'DELETE FROM ssinfo_oauth_states WHERE expires_at<UTC_TIMESTAMP()',
      );
      const [s] = await c.execute<mysql.RowDataPacket[]>(
        "SELECT data FROM ssinfo_site_settings WHERE id='general'",
      );
      const config =
        typeof s[0]?.data === 'string' ? JSON.parse(s[0].data) : s[0]?.data;
      const days = Math.min(
        365,
        Math.max(7, Number(config?.retentionDays) || 90),
      );
      await c.execute(
        'DELETE FROM ssinfo_analytics_visits WHERE created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL ? DAY)',
        [days],
      );
      await c.execute(
        'DELETE FROM ssinfo_audit_logs WHERE created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 365 DAY)',
      );
      await c.execute(
        'DELETE FROM ssinfo_api_usage WHERE created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 90 DAY)',
      );
    }
    console.log('Database ready. No analytics data was seeded.');
  } finally {
    await c.end();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Database setup failed',
  );
  process.exitCode = 1;
});
