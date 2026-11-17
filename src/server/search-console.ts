import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { requireUser } from './auth';
import { query, execute, transaction } from './db';
import {
  appOrigin,
  token,
  digest,
  seal,
  unseal,
  HttpError,
  audit,
} from './security';
import { dateRange } from './analytics';
function credentials() {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.INTEGRATION_ENCRYPTION_KEY
  )
    throw new HttpError(
      503,
      'Configure Google OAuth credentials and INTEGRATION_ENCRYPTION_KEY first.',
    );
  return {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
export async function connectGoogle() {
  const user = await requireUser('search-console');
  const { client_id } = credentials();
  const state = token();
  await execute(
    'INSERT INTO ssinfo_oauth_states (id,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))',
    [digest(state), user.id],
  );
  (await cookies()).set('idea_google_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: appOrigin().startsWith('https:'),
    path: '/api/v1/search-console',
    maxAge: 600,
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id,
    redirect_uri: appOrigin() + '/api/v1/search-console/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString();
  return url.toString();
}
async function googleJSON(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  if (!res.ok)
    throw new HttpError(
      502,
      'Google could not complete this request. Check property access or reconnect your account.',
    );
  return res.json();
}
export async function googleCallback(url: URL) {
  const user = await requireUser('search-console');
  const state = url.searchParams.get('state'),
    code = url.searchParams.get('code');
  const jar = await cookies();
  if (!state || !code || jar.get('idea_google_state')?.value !== state)
    throw new HttpError(400, 'Google connection expired. Start again.');
  await transaction(async (c) => {
    const [row] = await query(
      'SELECT id FROM ssinfo_oauth_states WHERE id=? AND user_id=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE',
      [digest(state), user.id],
      c,
    );
    if (!row) throw new HttpError(400, 'Google connection expired.');
    await execute('DELETE FROM ssinfo_oauth_states WHERE id=?', [digest(state)], c);
  });
  jar.delete('idea_google_state');
  const tokens = await googleJSON('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      ...credentials(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: appOrigin() + '/api/v1/search-console/callback',
    }),
  });
  if (!tokens.refresh_token)
    throw new HttpError(
      400,
      'Google did not return offline access. Reconnect with consent.',
    );
  const sites = await googleJSON(
    'https://www.googleapis.com/webmasters/v3/sites',
    { headers: { Authorization: 'Bearer ' + tokens.access_token } },
  );
  const expected = new URL(appOrigin()).hostname;
  for (const site of sites.siteEntry || []) {
    if (
      site.siteUrl !== 'sc-domain:' + expected &&
      site.siteUrl !== appOrigin() + '/'
    )
      continue;
    await execute(
      'INSERT INTO ssinfo_search_console_properties (id,property_url,encrypted_tokens) VALUES (?,?,?) ON DUPLICATE KEY UPDATE encrypted_tokens=VALUES(encrypted_tokens)',
      [
        randomUUID(),
        site.siteUrl,
        seal(JSON.stringify({ refresh_token: tokens.refresh_token })),
      ],
    );
  }
  await audit(user.id, 'google-connect', 'search-console');
}
export async function searchReport(url: URL) {
  await requireUser('search-console');
  const { start, end } = dateRange(url);
  const properties = await query<{ id: string; property_url: string }>(
    'SELECT id,property_url FROM ssinfo_search_console_properties',
  );
  const id = url.searchParams.get('property');
  if (!id)
    return { properties, configured: Boolean(process.env.GOOGLE_CLIENT_ID) };
  const [property] = await query<{
    id: string;
    property_url: string;
    encrypted_tokens: string;
  }>('SELECT * FROM ssinfo_search_console_properties WHERE id=?', [id]);
  if (!property) throw new HttpError(404, 'Property not found.');
  const dimension = url.searchParams.get('dimension') || 'date';
  if (!['date', 'query', 'page', 'country', 'device'].includes(dimension))
    throw new HttpError(400, 'Unknown report dimension.');
  const [cached] = await query<{ data: string | Record<string, unknown> }>(
    'SELECT data FROM ssinfo_search_console_data WHERE property_id=? AND start_date=? AND end_date=? AND dimension=? AND updated_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)',
    [id, start, end, dimension],
  );
  if (cached)
    return {
      properties,
      ...(typeof cached.data === 'string'
        ? JSON.parse(cached.data)
        : cached.data),
    };
  const saved = JSON.parse(unseal(property.encrypted_tokens));
  const access = await googleJSON('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      ...credentials(),
      grant_type: 'refresh_token',
      refresh_token: saved.refresh_token,
    }),
  });
  const report = await googleJSON(
    'https://www.googleapis.com/webmasters/v3/sites/' +
      encodeURIComponent(property.property_url) +
      '/searchAnalytics/query',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + access.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: start,
        endDate: end,
        dimensions: [dimension],
        rowLimit: 250,
      }),
    },
  );
  await execute(
    'INSERT INTO ssinfo_search_console_data (property_id,start_date,end_date,dimension,data) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE data=VALUES(data),updated_at=UTC_TIMESTAMP()',
    [id, start, end, dimension, JSON.stringify(report)],
  );
  return { properties, ...report };
}
