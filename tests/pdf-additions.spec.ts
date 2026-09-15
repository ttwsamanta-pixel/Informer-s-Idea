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
