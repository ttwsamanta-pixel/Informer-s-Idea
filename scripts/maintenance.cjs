/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node maintenance entry point. */
// Run with node --env-file=/private/path/.env scripts/maintenance.cjs
// Kept outside the public web directory on production.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const load = process.env.MAINTENANCE_MODULE_ROOT
  ? createRequire(
      path.resolve(process.env.MAINTENANCE_MODULE_ROOT, 'package.json'),
    )
  : require;
const mysql = load('mysql2/promise');

(async () => {
  const e = process.env;
  if (!e.DATABASE_NAME || !e.DATABASE_USER || !e.DATABASE_HOST)
    throw new Error('Database configuration is incomplete.');
  const dir =
    e.DATABASE_BACKUP_DIR ||
    path.join(require('node:os').homedir(), 'private-backups');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const c = await mysql.createConnection({
    host: e.DATABASE_HOST,
    port: Number(e.DATABASE_PORT || 3306),
    user: e.DATABASE_USER,
    password: e.DATABASE_PASSWORD,
    database: e.DATABASE_NAME,
    ...(e.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  try {
    const [lock] = await c.query(
      "SELECT GET_LOCK('ssinfo_daily_maintenance',0) AS acquired",
    );
    if (lock[0].acquired !== 1)
      throw new Error('Maintenance is already running.');
    const file = path.join(
      dir,
      'daily-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sql',
    );
    const temp = file + '.partial';
    const fd = fs.openSync(temp, 'wx', 0o600);
    let dump;
    try {
      dump = spawnSync(
        e.MYSQLDUMP_PATH || 'mysqldump',
        [
          '--single-transaction',
          '--skip-lock-tables',
          '--host=' + e.DATABASE_HOST,
          '--port=' + (e.DATABASE_PORT || 3306),
          '--user=' + e.DATABASE_USER,
          e.DATABASE_NAME,
        ],
        {
          env: { ...e, MYSQL_PWD: e.DATABASE_PASSWORD || '' },
          stdio: ['ignore', fd, 'pipe'],
        },
      );
    } finally {
      fs.closeSync(fd);
    }
    if (dump.status !== 0 || fs.statSync(temp).size === 0) {
      fs.unlinkSync(temp);
      throw new Error(
        'Backup failed; cleanup was not run. Check database access and mysqldump availability.',
      );
    }
    fs.renameSync(temp, file);
    for (const table of [
      'sessions',
      'password_resets',
      'rate_limits',
      'oauth_states',
    ]) {
      await c.execute(
        'DELETE FROM ssinfo_' + table + ' WHERE expires_at<UTC_TIMESTAMP()',
      );
    }
    const [settings] = await c.execute(
      "SELECT data FROM ssinfo_site_settings WHERE id='general'",
    );
    const config =
      typeof settings[0]?.data === 'string'
        ? JSON.parse(settings[0].data)
        : settings[0]?.data;
    const days = Math.floor(
      Math.min(365, Math.max(7, Number(config?.retentionDays) || 90)),
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
    // Only this script\'s own daily snapshots expire; manual backups are preserved.
    for (const name of fs.readdirSync(dir)) {
      if (!/^daily-[0-9T-]+Z\.sql$/.test(name)) continue;
      const candidate = path.join(dir, name);
      const stat = fs.lstatSync(candidate);
      if (stat.isFile() && Date.now() - stat.mtimeMs > 30 * 86400000)
        fs.unlinkSync(candidate);
    }
    console.log(
      new Date().toISOString(),
      'Backup saved and expired records cleaned.',
    );
  } finally {
    await c.end();
  }
})().catch(() => {
  console.error(
    'Maintenance failed. Check private server configuration; no credentials are logged.',
  );
  process.exitCode = 1;
});
