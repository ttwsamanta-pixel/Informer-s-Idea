import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, request } from '@playwright/test';

// Run only against an isolated, migrated test database with a bootstrapped admin.
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3200';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname))
  throw new Error('Local test server required.');
const admin = await request.newContext({
  baseURL,
  extraHTTPHeaders: { Origin: baseURL },
});
const anonymous = await request.newContext({
  baseURL,
  extraHTTPHeaders: { Origin: baseURL },
});
async function call(client, path, method = 'GET', data, expected = 200) {
  const response = await client.fetch('/api/v1/' + path, { method, data });
  const body = await response.json();
  assert.equal(response.status(), expected, `${path}: ${JSON.stringify(body)}`);
  return body.data;
}
const suffix = Date.now();
try {
  await call(anonymous, 'admin/dashboard', 'GET', undefined, 401);
  const forged = await anonymous.post('/api/v1/auth/login', {
    headers: { Origin: 'https://example.net' },
    data: {},
  });
  assert.equal(forged.status(), 403);
  await call(admin, 'auth/login', 'POST', {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@example.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'LocalTest-Only-Phase2!',
  });
  const me = await call(admin, 'auth/me');
  assert.ok(me.permissions.includes('*'));
  const editorEmail = `editor-${suffix}@example.test`;
  await call(admin, 'admin/users', 'POST', {
    name: 'Integration editor',
    email: editorEmail,
    password: 'EditorTest-Only-123!',
    role: 'Editor',
    status: 'active',
  });
  await call(anonymous, 'auth/login', 'POST', {
    email: editorEmail,
    password: 'EditorTest-Only-123!',
  });
  await call(anonymous, 'admin/settings', 'GET', undefined, 403);
  const post = await call(anonymous, 'admin/resources/posts', 'POST', {
    name: 'Integration article',
    slug: `integration-${suffix}`,
    status: 'published',
    content: 'A real integration test article.',
    description: 'Integration test',
  });
  let articles = await call(admin, 'public/blog');
  assert.ok(articles.some((p) => p.slug === post.slug));
  await call(anonymous, `admin/resources/posts/${post.id}`, 'DELETE');
  articles = await call(admin, 'public/blog');
  assert.ok(!articles.some((p) => p.slug === post.slug));
  const config = await call(admin, 'admin/settings');
  await call(admin, 'admin/settings', 'PUT', {
    ...config,
    analyticsEnabled: true,
  });
  const event = {
    id: randomUUID(),
    session: randomUUID(),
    visitor: randomUUID(),
    kind: 'page_view',
    path: '/',
    source: 'Direct',
    device: 'Desktop',
  };
  await call(anonymous, 'analytics/event', 'POST', event);
  const before = await call(admin, 'admin/dashboard');
  await call(anonymous, 'analytics/event', 'POST', event);
  const after = await call(admin, 'admin/dashboard');
  assert.deepEqual(
    after,
    before,
    'Duplicate analytics event must not increase totals',
  );
  const key = await call(admin, 'admin/api-keys', 'POST', {
    name: 'Integration key',
    scopes: ['tools:read'],
    rateLimit: 2,
  });
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Authorization: `Bearer ${key.key}` },
  });
  assert.ok((await call(api, 'catalog/tools')).length > 0);
  await call(api, 'catalog/blog', 'GET', undefined, 403);
  await call(api, 'catalog/tools');
  await call(api, 'catalog/tools', 'GET', undefined, 429);
  await call(admin, `admin/api-keys/${key.id}`, 'DELETE');
  await call(api, 'catalog/tools', 'GET', undefined, 403);
  await api.dispose();
  await call(admin, 'admin/redirects', 'POST', {
    source: `/test-old-${suffix}`,
    destination: '/all-tools',
  });
  const redirect = await admin.get(`/test-old-${suffix}`, { maxRedirects: 0 });
  assert.equal(redirect.status(), 301);
  assert.ok((await admin.get('/sitemap.xml')).ok());
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: await admin.storageState(),
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(baseURL + '/admin');
  await page.getByText('Visitors overview', { exact: false }).first().waitFor();
  await page.screenshot({ path: '.local/admin-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert.ok(
    await page
      .locator('.admin-sidebar')
      .evaluate((el) => el.getBoundingClientRect().right <= 0),
    'Mobile sidebar must start closed',
  );
  await page.screenshot({ path: '.local/admin-mobile.png', fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'Mobile horizontal overflow',
  );
  assert.deepEqual(errors, []);
  await browser.close();
  await call(admin, 'admin/settings', 'PUT', config);
  await call(admin, 'auth/logout', 'POST');
  await call(admin, 'admin/dashboard', 'GET', undefined, 401);
  console.log(
    'PASS: authentication, CSRF, roles, publishing, analytics deduplication, scoped/revoked keys, redirects, sitemap, responsive admin.',
  );
} finally {
  await admin.dispose();
  await anonymous.dispose();
}
