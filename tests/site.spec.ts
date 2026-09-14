import { test, expect, type Page, type Download } from '@playwright/test';
import { PDFDocument, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { tools } from '../src/config/tools';

async function imageFixture(
  page: Page,
  format = 'png',
  width = 640,
  height = 480,
) {
  const data = await page.evaluate(
    ({ format, width, height }) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const x = c.getContext('2d')!;
      x.fillStyle = 'white';
      x.fillRect(0, 0, width, height);
      x.fillStyle = '#2357ee';
      x.fillRect(0, 0, width / 2, height);
      x.fillStyle = '#e34332';
      x.fillRect(width / 2, height / 2, width / 2, height / 2);
      x.font = 'bold 48px Arial';
      x.fillStyle = 'black';
      x.fillText('HELLO WORLD', 30, 80);
      return c.toDataURL('image/' + format, 0.98).split(',')[1];
    },
    { format, width, height },
  );
  return {
    name: 'test.' + (format === 'jpeg' ? 'jpg' : format),
    mimeType: 'image/' + format,
    buffer: Buffer.from(data, 'base64'),
  };
}
async function pdfFixture(count = 3) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i++) {
    const page = doc.addPage([300 + i * 20, 400]);
    page.drawText(`Page ${i + 1}`, {
      x: 20,
      y: 300,
      size: 28,
      color: rgb(0.1, 0.2, 0.6),
    });
  }
  return {
    name: 'test.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await doc.save()),
  };
}
async function bytes(d: Download) {
  return readFile((await d.path())!);
}
async function resultDownload(page: Page, label = 'Download') {
  const result = page.waitForEvent('download');
  await page
    .locator('.result-card')
    .getByRole('button', { name: label, exact: true })
    .click();
  return bytes(await result);
}
async function imageInfo(page: Page, buffer: Buffer) {
  return page.evaluate(async (data) => {
    const b = await createImageBitmap(new Blob([Uint8Array.from(data)]));
    const info = { width: b.width, height: b.height };
    b.close();
    return info;
  }, Array.from(buffer));
}

test('homepage matches responsive layouts, has no overflow, and theme/search/navigation work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'All Your Online Tools',
  );
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await page.keyboard.press('Control+k');
  await page
    .getByRole('textbox', { name: 'Search all tools' })
    .fill('merge pdf');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/tools\/merge-pdf/);
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/home-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'OCR Tools' })
    .click();
  await expect(page).toHaveURL(/ocr-tools/);
  expect(errors).toEqual([]);
});
test('directory search, category filters and persisted favorites', async ({
  page,
}) => {
  await page.goto('/all-tools?q=compress');
  await expect(
    page.getByRole('textbox', { name: 'Search directory' }),
  ).toHaveValue('compress');
  await page.getByRole('textbox', { name: 'Search directory' }).fill('');
  await page
    .getByRole('button', {
      name: 'Add to favorites: Resize Image',
      exact: true,
    })
    .click();
  await page.getByLabel('Sort and filter tools').selectOption('favorites');
  await expect(page.locator('.tool-card')).toHaveCount(1);
  await page.reload();
  await page.getByLabel('Sort and filter tools').selectOption('favorites');
  await expect(page.locator('.tool-card')).toHaveCount(1);
});
for (const format of ['jpeg', 'png', 'webp'])
  test(`real ${format} compression produces a decodable image`, async ({
    page,
  }) => {
    await page.goto('/tools/compress-image');
    const fixture = await imageFixture(page, format);
    await page.locator('input[type=file]').setInputFiles(fixture);
    await page
      .getByRole('button', { name: 'Compress Image', exact: true })
      .click();
    await expect(page.locator('.result-card')).toBeVisible();
    const out = await resultDownload(page);
    expect((await imageInfo(page, out)).width).toBe(640);
    expect(out.length).toBeGreaterThan(100);
  });
test('resize, crop, rotate, flip, conversion and bulk ZIP', async ({
  page,
}) => {
  for (const [slug, expected] of [
    ['resize-image', { width: 320, height: 240 }],
    ['crop-image', { width: 320, height: 240 }],
    ['rotate-image', { width: 480, height: 640 }],
    ['flip-image', { width: 640, height: 480 }],
    ['jpg-to-png', { width: 640, height: 480 }],
  ] as const) {
    await page.goto('/tools/' + slug);
    await page
      .locator('input[type=file]')
      .setInputFiles(await imageFixture(page, 'jpeg'));
    if (slug === 'resize-image') {
      await page.getByLabel('Width (px)', { exact: true }).fill('320');
      await page.getByLabel('Height (px)', { exact: true }).fill('240');
    }
    if (slug === 'crop-image') {
      await page.getByLabel('Crop width (%)').fill('50');
      await page.getByLabel('Crop height (%)').fill('50');
    }
    const tool = tools.find((t) => t.slug === slug)!;
    await page.getByRole('button', { name: tool.name, exact: true }).click();
    const out = await resultDownload(page);
    expect(await imageInfo(page, out)).toEqual(expected);
  }
  await page.goto('/tools/convert-image');
  const fixture = await imageFixture(page);
  await page
    .locator('input[type=file]')
    .setInputFiles([fixture, { ...fixture, name: 'second.png' }]);
  await page.getByLabel('Output format').selectOption('webp');
  await page
    .getByRole('button', { name: 'Convert Image', exact: true })
    .click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP' }).click();
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await bytes(await download));
  expect(Object.keys(zip.files)).toHaveLength(2);
});
test('PDF merge, split, rotate, delete, image-to-PDF and PDF rasterization', async ({
  page,
}) => {
  for (const op of [
    'merge-pdf',
    'split-pdf',
    'rotate-pdf',
    'delete-pdf-pages',
    'image-to-pdf',
    'pdf-to-jpg',
  ]) {
    await page.goto('/tools/' + op);
    const input = page.locator('input[type=file]');
    const fixture = await pdfFixture();
    if (op === 'image-to-pdf')
      await input.setInputFiles(await imageFixture(page));
    else if (op === 'merge-pdf')
      await input.setInputFiles([fixture, { ...fixture, name: 'second.pdf' }]);
    else await input.setInputFiles(fixture);
    if (op === 'split-pdf')
      await page.getByLabel('Pages (blank = all)').fill('2');
    if (op === 'delete-pdf-pages')
      await page.getByLabel('Pages to remove').fill('2');
    if (op === 'pdf-to-jpg')
      await page.getByLabel('Pages (blank = all)').fill('1');
    await page
      .getByRole('button', {
        name: tools.find((t) => t.slug === op)!.name,
        exact: true,
      })
      .click();
    const out = await resultDownload(page);
    if (op === 'pdf-to-jpg') {
      expect((await imageInfo(page, out)).width).toBe(450);
    } else {
      const pdf = await PDFDocument.load(out);
      expect(pdf.getPageCount()).toBe(
        op === 'merge-pdf'
          ? 6
          : op === 'delete-pdf-pages'
            ? 2
            : op === 'rotate-pdf'
              ? 3
              : 1,
      );
      if (op === 'rotate-pdf')
        expect(pdf.getPage(0).getRotation().angle).toBe(90);
    }
  }
});
test('passport dimensions, density metadata and A4 sheet', async ({ page }) => {
  await page.goto('/tools/passport-photo-maker');
  await page
    .locator('input[type=file]')
    .setInputFiles(await imageFixture(page));
  await page.getByLabel('Also create an A4 print sheet').check();
  await page
    .getByRole('button', { name: 'Create photo & print sheet', exact: true })
    .click();
  const image = await resultDownload(page, 'Download 1');
  expect(await imageInfo(page, image)).toEqual({ width: 413, height: 531 });
  expect(image[13]).toBe(1);
  expect(image.readUInt16BE(14)).toBe(300);
  const sheet = await PDFDocument.load(
    await resultDownload(page, 'Download 2'),
  );
  expect(sheet.getPage(0).getWidth()).toBeCloseTo(595.28);
  expect(sheet.getPage(0).getHeight()).toBeCloseTo(841.89);
});
test('QR generation can be decoded by the scanner', async ({ page }) => {
  await page.goto('/tools/qr-code-generator');
  await page.getByLabel('Text or website URL').fill('https://example.com/test');
  await page.getByRole('button', { name: 'Generate QR code' }).click();
  await expect(page.getByAltText('Generated QR code')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const png = await bytes(await download);
  await page.goto('/tools/qr-code-scanner');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: png });
  await page
    .getByRole('button', { name: 'QR Code Scanner', exact: true })
    .click();
  await expect(page.getByLabel('Output text')).toHaveValue(
    'https://example.com/test',
  );
});
test('OCR recognizes real text locally', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/tools/image-to-text');
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1000;
    c.height = 400;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1000, 400);
    ctx.fillStyle = 'black';
    ctx.font = '60px Arial';
    ctx.fillText('HELLO WORLD', 70, 160);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'ocr.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  });
  await page
    .getByRole('button', { name: 'Image to Text', exact: true })
    .click();
  await expect(page.getByLabel('Output text')).toHaveValue(/HELLO WORLD/i, {
    timeout: 150000,
  });
});
test('utilities validate and convert actual content', async ({ page }) => {
  await page.goto('/tools/json-formatter');
  await page.getByLabel('Text', { exact: true }).fill('{"hello":123}');
  await page
    .getByRole('button', { name: 'JSON Formatter', exact: true })
    .click();
  await expect(page.getByLabel('Output text')).toHaveValue(
    '{\n  "hello": 123\n}',
  );
  await page.goto('/tools/base64-encoder');
  await page.getByLabel('Text', { exact: true }).fill('Hello 🌍');
  await page
    .getByRole('button', { name: 'Base64 Encoder', exact: true })
    .click();
  expect(
    Buffer.from(
      await page.getByLabel('Output text').inputValue(),
      'base64',
    ).toString(),
  ).toBe('Hello 🌍');
  await page.goto('/tools/unit-converter');
  await page.getByLabel('Value', { exact: true }).fill('2');
  await page
    .getByRole('button', { name: 'Unit Converter', exact: true })
    .click();
  await expect(page.getByLabel('Output text')).toHaveValue('2 m = 200 cm');
});
test('invalid, oversized and corrupted files are rejected', async ({
  page,
}) => {
  await page.goto('/tools/resize-image');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fake.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });
  await expect(page.locator('.error-message[role=alert]')).toContainText(
    'not a supported',
  );
  await page.locator('input[type=file]').setInputFiles({
    name: 'huge.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(41 * 1024 * 1024),
  });
  await expect(page.locator('.error-message[role=alert]')).toContainText(
    '40 MB',
  );
  await page.goto('/tools/merge-pdf');
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\ninvalid data'),
  });
  await page.getByRole('button', { name: 'Merge PDF', exact: true }).click();
  await expect(page.locator('.error-message[role=alert]')).toBeVisible();
});
test('all published routes respond successfully', async ({ request }) => {
  for (const path of [
    '/',
    '/all-tools',
    '/image-tools',
    '/pdf-tools',
    '/passport-tools',
    '/ocr-tools',
    '/qr-tools',
    '/converter-tools',
    '/utility-tools',
    '/ai-tools',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms-of-use',
    '/disclaimer',
    '/blog',
    '/sitemap.xml',
    '/robots.txt',
    ...tools.map((t) => '/tools/' + t.slug),
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
  expect((await request.get('/tools/no-such-tool')).status()).toBe(404);
});

test('background removal runs a real local model', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto('/tools/remove-background');
  await page
    .locator('input[type=file]')
    .setInputFiles(await imageFixture(page, 'png', 400, 400));
  await page
    .getByRole('button', { name: 'Remove Background', exact: true })
    .click();
  await expect(page.locator('.result-card')).toBeVisible({ timeout: 220000 });
  const out = await resultDownload(page);
  expect(await imageInfo(page, out)).toEqual({ width: 400, height: 400 });
});

test('large valid image processes within the documented limits', async ({
  page,
}) => {
  await page.goto('/tools/resize-image');
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1536;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.createImageData(canvas.width, canvas.height);
    let seed = 42;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      pixels.data[i] = seed & 255;
      pixels.data[i + 1] = (seed >>> 8) & 255;
      pixels.data[i + 2] = (seed >>> 16) & 255;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const buffer = Buffer.from(data, 'base64');
  expect(buffer.length).toBeGreaterThan(5 * 1024 * 1024);
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'large-valid.png', mimeType: 'image/png', buffer });
  await page.getByLabel('Width (px)', { exact: true }).fill('512');
  await expect(page.getByLabel('Height (px)', { exact: true })).toHaveValue(
    '384',
  );
  await page.getByRole('button', { name: 'Resize Image', exact: true }).click();
  expect(await imageInfo(page, await resultDownload(page))).toEqual({
    width: 512,
    height: 384,
  });
});
