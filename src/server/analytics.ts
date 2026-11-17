import 'server-only';
import { z } from 'zod';
import { query, execute, transaction } from './db';
import { digest, rateLimit, requestIdentity, HttpError } from './security';
import { settings } from './content';
const eventSchema = z
  .object({
    id: z.uuid(),
    session: z.uuid(),
    visitor: z.uuid(),
    kind: z.enum(['page_view', 'tool_started']),
    path: z
      .string()
      .max(255)
      .regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/),
    tool: z
      .string()
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    source: z.enum(['Direct', 'Google', 'Bing', 'Social', 'Referral', 'Other']),
    device: z.enum(['Desktop', 'Mobile', 'Tablet']),
  })
  .strict();
export async function recordEvent(req: Request, body: unknown) {
  const config = await settings();
  if (!config.analyticsEnabled) return { recorded: false };
  const event = eventSchema.parse(body);
  await rateLimit('analytics:' + requestIdentity(req), 600, 60);
  if (event.kind === 'tool_started' && !event.tool)
    throw new HttpError(400, 'Tool is required.');
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret) throw new HttpError(503, 'Analytics is not configured.');
  const visitorHash = digest(secret + event.visitor);
  // Only trust a country header if the hosting proxy overwrites it.
  const header = process.env.TRUSTED_COUNTRY_HEADER;
  const country = header ? req.headers.get(header)?.toUpperCase() : undefined;
  await transaction(async (c) => {
    await execute(
      'INSERT IGNORE INTO ssinfo_analytics_visits (id,visitor_hash,device,country,source) VALUES (?,?,?,?,?)',
      [
        event.session,
        visitorHash,
        event.device,
        country && /^[A-Z]{2}$/.test(country) ? country : null,
        event.source,
      ],
      c,
    );
    const [session] = await query<{ visitor_hash: string }>(
      'SELECT visitor_hash FROM ssinfo_analytics_visits WHERE id=?',
      [event.session],
      c,
    );
    if (session.visitor_hash !== visitorHash)
      throw new HttpError(400, 'Invalid session.');
    const [old] = await query(
      'SELECT id FROM ssinfo_analytics_events WHERE id=?',
      [event.id],
      c,
    );
    if (old) return;
    await execute(
      'INSERT INTO ssinfo_analytics_events (id,visit_id,kind,path,tool) VALUES (?,?,?,?,?)',
      [event.id, event.session, event.kind, event.path, event.tool || null],
      c,
    );
    await execute(
      'INSERT INTO ssinfo_analytics_daily (day,page_views,tool_uses) VALUES (UTC_DATE(),?,?) ON DUPLICATE KEY UPDATE page_views=page_views+VALUES(page_views),tool_uses=tool_uses+VALUES(tool_uses)',
      [
        event.kind === 'page_view' ? 1 : 0,
        event.kind === 'tool_started' ? 1 : 0,
      ],
      c,
    );
    if (event.tool)
      await execute(
        'INSERT INTO ssinfo_analytics_tool_usage (day,tool,uses) VALUES (UTC_DATE(),?,1) ON DUPLICATE KEY UPDATE uses=uses+1',
        [event.tool],
        c,
      );
  });
  return { recorded: true };
}
export function dateRange(url: URL) {
  const end =
    url.searchParams.get('end') || new Date().toISOString().slice(0, 10);
  const start =
    url.searchParams.get('start') ||
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    start > end ||
    (Date.parse(end) - Date.parse(start)) / 86400000 > 366
  )
    throw new HttpError(400, 'Choose a valid date range of up to one year.');
  return {
    start,
    end,
    until: new Date(Date.parse(end) + 86400000).toISOString().slice(0, 10),
  };
}
export async function dashboard(url: URL) {
  const { start, end, until } = dateRange(url),
    range = [start, until];
  const [
    visitors,
    events,
    users,
    premium,
    posts,
    payments,
    days,
    topTools,
    topPages,
    countries,
    devices,
    sources,
  ] = await Promise.all([
    query(
      'SELECT COUNT(DISTINCT visitor_hash) AS value FROM ssinfo_analytics_visits WHERE created_at>=? AND created_at<?',
      range,
    ),
    query(
      'SELECT kind,COUNT(*) AS value FROM ssinfo_analytics_events WHERE created_at>=? AND created_at<? GROUP BY kind',
      range,
    ),
    query('SELECT COUNT(*) AS value FROM ssinfo_users WHERE deleted_at IS NULL'),
    query(
      "SELECT COUNT(DISTINCT user_id) AS value FROM ssinfo_subscriptions WHERE status='active' AND starts_at<=UTC_TIMESTAMP() AND ends_at>UTC_TIMESTAMP()",
    ),
    query("SELECT COUNT(*) AS value FROM ssinfo_blog_posts WHERE status='published'"),
    query(
      "SELECT currency,SUM(amount) AS value FROM ssinfo_payments WHERE status='paid' AND created_at>=? AND created_at<? GROUP BY currency",
      range,
    ),
    query(
      "SELECT DATE(e.created_at) AS day,COUNT(DISTINCT v.visitor_hash) AS visitors,SUM(e.kind='page_view') AS pageViews,SUM(e.kind='tool_started') AS toolUses FROM ssinfo_analytics_events e JOIN ssinfo_analytics_visits v ON v.id=e.visit_id WHERE e.created_at>=? AND e.created_at<? GROUP BY DATE(e.created_at) ORDER BY day",
      range,
    ),
    query(
      "SELECT tool AS name,COUNT(*) AS value FROM ssinfo_analytics_events WHERE kind='tool_started' AND created_at>=? AND created_at<? GROUP BY tool ORDER BY value DESC LIMIT 10",
      range,
    ),
    query(
      "SELECT path AS name,COUNT(*) AS value FROM ssinfo_analytics_events WHERE kind='page_view' AND created_at>=? AND created_at<? GROUP BY path ORDER BY value DESC LIMIT 20",
      range,
    ),
    query(
      "SELECT COALESCE(country,'Unknown') AS name,COUNT(*) AS value FROM ssinfo_analytics_visits WHERE created_at>=? AND created_at<? GROUP BY country ORDER BY value DESC",
      range,
    ),
    query(
      'SELECT device AS name,COUNT(*) AS value FROM ssinfo_analytics_visits WHERE created_at>=? AND created_at<? GROUP BY device ORDER BY value DESC',
      range,
    ),
    query(
      'SELECT source AS name,COUNT(*) AS value FROM ssinfo_analytics_visits WHERE created_at>=? AND created_at<? GROUP BY source ORDER BY value DESC',
      range,
    ),
  ]);
  const series = days.length
    ? Array.from(
        {
          length:
            Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1,
        },
        (_, i) => {
          const day = new Date(Date.parse(start) + i * 86400000)
            .toISOString()
            .slice(0, 10);
          return (
            days.find((d) => String(d.day).slice(0, 10) === day) || {
              day,
              visitors: 0,
              pageViews: 0,
              toolUses: 0,
            }
          );
        },
      )
    : [];
  return {
    start,
    end,
    visitors: Number(visitors[0].value),
    pageViews: Number(events.find((e) => e.kind === 'page_view')?.value || 0),
    toolUses: Number(events.find((e) => e.kind === 'tool_started')?.value || 0),
    users: Number(users[0].value),
    premium: Number(premium[0].value),
    posts: Number(posts[0].value),
    revenue: payments,
    days: series,
    topTools,
    topPages,
    countries,
    devices,
    sources,
  };
}
