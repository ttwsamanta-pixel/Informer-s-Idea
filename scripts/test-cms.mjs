import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const base = process.env.TEST_BASE_URL || 'http://localhost:3210';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('CMS tests require an isolated local server.');
if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD)
  throw new Error(
    'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD for an isolated test admin.',
  );
const api = await request.newContext({
  baseURL: base,
  extraHTTPHeaders: { Origin: base },
});
async function call(path, method = 'GET', data, status = 200) {
  const r = await api.fetch('/api/v1/' + path, { method, data });
  const b = await r.json();
  assert.equal(r.status(), status, JSON.stringify(b));
  return b.data;
}
await call('auth/login', 'POST', {
  email: process.env.TEST_ADMIN_EMAIL,
  password: process.env.TEST_ADMIN_PASSWORD,
});
const pages = await call('admin/resources/seo');
assert.ok(pages.total > 90);
const png = await sharp({
  create: { width: 180, height: 90, channels: 4, background: '#7733ff' },
})
  .png()
  .toBuffer();
const r = await api.post('/api/v1/admin/media', {
  data: png,
  headers: { 'Content-Type': 'image/png' },
});
const upload = await r.json();
assert.equal(r.status(), 200, JSON.stringify(upload));
const image = upload.data.url;
assert.equal((await api.get(image)).headers()['content-type'], 'image/webp');
await call('admin/media', 'POST', 'not an image', 400);
const suffix = Date.now();
const body = {
  name: 'CMS test',
  slug: '/cms-test-' + suffix,
  status: 'active',
  pageTitle: 'CMS Test Heading',
  description: 'CMS summary',
  content:
    '<h2>Heading</h2><p>Rich <strong>bold</strong> text.</p><img src="' +
    image +
    '"><script>alert(1)</script><img src=x onerror=alert(1)>',
  seoTitle: 'CMS SEO Title',
  seoDescription: 'CMS SEO description',
  seoKeywords: 'cms, test',
};
const record = await call('admin/resources/seo', 'POST', body);
const html = await (await api.get(body.slug)).text();
assert.ok(html.includes('CMS Test Heading'));
assert.ok(html.includes('CMS SEO Title'));
assert.ok(html.includes('cms, test') || html.includes('cms,test'));
assert.ok(html.includes(image));
assert.ok(!html.includes('<script>alert(1)</script>'));
const config = await call('admin/settings');
await call('admin/settings', 'PUT', {
  ...config,
  logo: image,
  favicon: image,
  facebook: 'https://facebook.com/example',
  youtubeBangla: 'https://youtube.com/@test',
});
const home = await (await api.get('/')).text();
assert.ok(home.includes(image));
assert.ok(home.includes('https://facebook.com/example'));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: await api.storageState(),
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base + '/admin/seo');
await page.getByPlaceholder('Search by name').fill('CMS test');
await page.getByRole('button', { name: 'Edit', exact: true }).click();
await page.locator('.ck-editor__editable').waitFor({ timeout: 30000 });
assert.ok(
  (await page.locator('.ck-editor__editable').innerHTML()).includes(
    '<strong>bold</strong>',
  ),
);
await page.locator('.ck-editor__editable').fill('Edited in CKEditor');
await page.getByRole('button', { name: 'Save changes', exact: true }).click();
await page.getByRole('dialog').waitFor({ state: 'hidden' });
assert.ok(
  (await (await api.get(body.slug)).text()).includes('Edited in CKEditor'),
);
assert.deepEqual(errors, []);
await call('admin/resources/seo/' + record.id, 'DELETE');
assert.equal((await api.get(body.slug)).status(), 404);
assert.ok(!(await call('admin/resources/seo?q=CMS%20test')).items.length);
const account = await call('admin/users', 'POST', {
  name: 'Delete Test',
  email: 'delete-' + suffix + '@example.test',
  password: 'Delete-Test-Only-123!',
  role: 'Editor',
  status: 'active',
});
await call('admin/users/' + account.id, 'DELETE');
assert.ok(!(await call('admin/users')).some((u) => u.id === account.id));
const own = (await call('admin/users')).find(
  (u) => u.email === process.env.TEST_ADMIN_EMAIL,
);
await call('admin/users/' + own.id, 'DELETE', undefined, 400);
const post = await call('admin/resources/posts', 'POST', {
  name: 'Test post',
  slug: 'cms-blog-' + suffix,
  status: 'published',
  content: '<p>Blog <strong>format</strong></p>',
  featuredImage: image,
  seoTitle: 'Blog SEO',
  seoDescription: 'Test blog description',
  seoKeywords: 'blog,test',
});
const postHtml = await (await api.get('/blog/cms-blog-' + suffix)).text();
assert.ok(postHtml.includes('<strong>format</strong>'));
assert.ok(postHtml.includes(image));
assert.ok(postHtml.includes('Blog SEO'));
await call('admin/resources/posts/' + post.id, 'DELETE');
assert.equal((await api.get('/blog/cms-blog-' + suffix)).status(), 404);
const denied = await request.newContext({
  baseURL: base,
  extraHTTPHeaders: { Origin: base },
});
assert.equal(
  (await denied.post('/api/v1/admin/media', { data: png })).status(),
  401,
);
await denied.dispose();
await call('admin/settings', 'PUT', config);
await browser.close();
await api.dispose();
console.log(
  'PASS: seeded pages, uploads, invalid image rejection, rich HTML sanitization, SEO, branding, CKEditor save and deletion',
);
