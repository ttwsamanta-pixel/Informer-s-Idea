import { test, expect, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

async function download(page: Page) {
  const event = page.waitForEvent('download');
  await page
    .locator('.result-card')
    .getByRole('button', { name: 'Download', exact: true })
    .click();
  return readFile((await (await event).path())!);
}
async function textPages(bytes: Uint8Array) {
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      pages.push(
        content.items.map((item) => ('str' in item ? item.str : '')).join(' '),
      );
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

test('PDF tools are discoverable and editor preserves original text while adding selected-page text', async ({
  page,
}) => {
  await page.goto('/pdf-tools');
  await expect(
    page
      .locator('main')
      .getByRole('heading', { name: 'Compress PDF', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('main')
      .getByRole('heading', { name: 'Edit PDF', exact: true }),
  ).toBeVisible();
  const doc = await PDFDocument.create();
  for (let i = 0; i < 2; i++)
    doc
      .addPage([300, 400])
      .drawText('Original page ' + (i + 1), { x: 10, y: 200, size: 12 });
  await page.goto('/tools/edit-pdf');
  await page.locator('input[type=file]').setInputFiles({
    name: 'input.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await doc.save()),
  });
  await page.getByLabel('Text to add').fill('Approved');
  await page.getByLabel('Pages (blank = all)').fill('2');
  await page.getByLabel('Text color').fill('#ff0000');
  await page.getByRole('button', { name: 'Edit PDF', exact: true }).click();
  await expect(page.locator('.result-card')).toBeVisible();
  const bytes = await download(page);
  const texts = await textPages(bytes);
  expect(texts[0]).toContain('Original page 1');
  expect(texts[0]).not.toContain('Approved');
  expect(texts[1]).toContain('Original page 2');
  expect(texts[1]).toContain('Approved');
  await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByLabel('PDF page 2 preview')).toBeVisible();
  await expect(page.getByLabel('PDF page 2 preview')).toHaveAttribute(
    'data-page',
    '2',
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: 'test-results/pdf-editor-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: 'test-results/pdf-editor-mobile.png',
    fullPage: true,
  });
  await page.getByLabel('Left offset (points)').fill('9999');
  await page.getByRole('button', { name: 'Edit PDF', exact: true }).click();
  await expect(page.locator('.error-message')).toContainText('does not fit');
  await expect(page.locator('.result-card')).toHaveCount(0);
});

test('lossless compression preserves text and never returns a larger file', async ({
  page,
}) => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 10; i++)
    doc.addPage().drawText('Keep this selectable text');
  const input = Buffer.from(await doc.save({ useObjectStreams: false }));
  await page.goto('/tools/compress-pdf');
  await page.locator('input[type=file]').setInputFiles({
    name: 'input.pdf',
    mimeType: 'application/pdf',
    buffer: input,
  });
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  await expect(page.locator('.result-card')).toBeVisible();
  const bytes = await download(page);
  expect(bytes.length).toBeLessThan(input.length);
  expect(await textPages(bytes)).toHaveLength(10);
  expect((await textPages(bytes))[0]).toContain('Keep this selectable text');
  // A second optimization should fall back to the unchanged original.
  await page.locator('input[type=file]').setInputFiles({
    name: 'optimized.pdf',
    mimeType: 'application/pdf',
    buffer: bytes,
  });
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  await expect(page.locator('.result-card')).toContainText(
    'original PDF is returned unchanged',
  );
  expect(await download(page)).toEqual(bytes);
});

test('image-based compression shrinks a scan and preserves page dimensions', async ({
  page,
}) => {
  await page.goto('/tools/compress-pdf');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.createImageData(600, 800);
    let seed = 42;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      pixels.data[i] = seed & 255;
      pixels.data[i + 1] = (seed >>> 8) & 255;
      pixels.data[i + 2] = (seed >>> 16) & 255;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL().split(',')[1];
  });
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(Buffer.from(png, 'base64'));
  doc
    .addPage([300, 400])
    .drawImage(image, { x: 0, y: 0, width: 300, height: 400 });
  const input = Buffer.from(await doc.save());
  await page.locator('input[type=file]').setInputFiles({
    name: 'scan.pdf',
    mimeType: 'application/pdf',
    buffer: input,
  });
  await page.getByLabel('Compression mode').selectOption('raster');
  await expect(
    page.getByText('Text will no longer be selectable', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Render resolution').selectOption('1');
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  await expect(page.locator('.result-card')).toBeVisible();
  const bytes = await download(page);
  expect(bytes.length).toBeLessThan(input.length);
  const result = await PDFDocument.load(bytes);
  expect(result.getPageCount()).toBe(1);
  expect(result.getPage(0).getSize()).toEqual({ width: 300, height: 400 });
});
