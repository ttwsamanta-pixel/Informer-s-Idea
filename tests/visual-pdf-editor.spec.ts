import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, degrees } from 'pdf-lib';
let mupdf: typeof import('mupdf');
test.beforeAll(async () => {
  mupdf = await import('mupdf');
});
import { readFile } from 'node:fs/promises';

async function ready(page: Page) {
  await expect(page.locator('.editor-instruction')).not.toContainText(
    'Rendering',
  );
  await expect(
    page.getByRole('button', { name: 'Download PDF', exact: true }),
  ).toBeEnabled();
}
async function exported(page: Page) {
  await ready(page);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  return new Uint8Array(await readFile((await (await event).path())!));
}
async function image(page: Page, color: string) {
  return Buffer.from(
    await page.evaluate((color) => {
      const c = document.createElement('canvas');
      c.width = c.height = 100;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 100, 100);
      return c.toDataURL().split(',')[1];
    }, color),
    'base64',
  );
}
async function fixture(page: Page, rotate = false) {
  const doc = await PDFDocument.create();
  const first = doc.addPage([500, 650]);
  first.drawText('Original headline', { x: 35, y: 570, size: 20 });
  first.drawText('Keep this neighboring line', { x: 35, y: 530, size: 14 });
  first.drawImage(await doc.embedPng(await image(page, '#00ff00')), {
    x: 300,
    y: 200,
    width: 100,
    height: 100,
  });
  const second = doc.addPage([500, 650]);
  second.drawText('Page two untouched', { x: 40, y: 400, size: 18 });
  if (rotate) first.setRotation(degrees(90));
  return {
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await doc.save()),
  };
}
async function open(page: Page, rotate = false) {
  await page.goto('/tools/edit-pdf');
  await page
    .locator('.editor-welcome input[type=file]')
    .setInputFiles(await fixture(page, rotate));
  await page.getByLabel('Text selection').selectOption('lines');
  await expect(
    page.getByRole('button', {
      name: 'Edit existing text: Original headline',
      exact: true,
    }),
  ).toBeVisible();
  await ready(page);
}
function contents(bytes: Uint8Array) {
  const doc = new mupdf.PDFDocument(bytes);
  const texts = Array.from({ length: doc.countPages() }, (_, i) => {
    const page = doc.loadPage(i),
      text = page.toStructuredText('');
    const value = text.asText();
    text.destroy();
    page.destroy();
    return value;
  });
  doc.destroy();
  return texts;
}
test('visual text replacement removes original text, preserves neighbors and supports undo and page navigation', async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole('button', {
      name: 'Edit existing text: Original headline',
      exact: true,
    })
    .click();
  await page.getByLabel('Text content').fill('Updated headline');
  await page.getByLabel('Width (pt)').fill('300');
  await page.getByLabel('Height (pt)').fill('45');
  await page.getByRole('button', { name: 'Apply object' }).click();
  let result = contents(await exported(page));
  expect(result[0]).toContain('Updated headline');
  expect(result[0]).not.toContain('Original headline');
  expect(result[0]).toContain('Keep this neighboring line');
  expect(result[1]).toContain('Page two untouched');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  result = contents(await exported(page));
  expect(result[0]).toContain('Original headline');
  expect(result[0]).not.toContain('Updated headline');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await ready(page);
  await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
  await ready(page);
  await expect(
    page.getByRole('button', {
      name: 'Edit existing text: Page two untouched',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.editor-paper').click({ position: { x: 60, y: 80 } });
  await page.getByLabel('Text content').fill('Added on page two');
  await page.getByRole('button', { name: 'Apply object' }).click();
  result = contents(await exported(page));
  expect(result[0]).not.toContain('Added on page two');
  expect(result[1]).toContain('Added on page two');
});
test('existing image replacement and deletion change the actual PDF content', async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole('button', { name: 'Edit existing image', exact: true })
    .click();
  await page.getByLabel('Choose editor image').setInputFiles({
    name: 'red.png',
    mimeType: 'image/png',
    buffer: await image(page, '#ff0000'),
  });
  await page.getByRole('button', { name: 'Apply object' }).click();
  const doc = new mupdf.PDFDocument(await exported(page));
  const first = doc.loadPage(0),
    text = first.toStructuredText('preserve-images');
  const colors: number[][] = [];
  text.walk({
    onImageBlock(_r, _t, image) {
      const pix = image.toPixmap();
      colors.push([...pix.getPixels().slice(0, 3)]);
      pix.destroy();
    },
  });
  expect(colors).toEqual([[255, 0, 0]]);
  text.destroy();
  first.destroy();
  doc.destroy();
  await page
    .getByRole('button', { name: 'Edit existing image', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Delete object', exact: true })
    .click();
  const removed = new mupdf.PDFDocument(await exported(page));
  const p = removed.loadPage(0),
    s = p.toStructuredText('preserve-images');
  let count = 0;
  s.walk({
    onImageBlock() {
      count++;
    },
  });
  expect(count).toBe(0);
  s.destroy();
  p.destroy();
  removed.destroy();
});
test('shapes, links, signing, movement and responsive editor remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  await page.locator('.editor-paper').click({ position: { x: 100, y: 200 } });
  await page.getByRole('button', { name: 'Apply object' }).click();
  await ready(page);
  const object = page.getByRole('button', {
    name: 'Edit added rectangle',
    exact: true,
  });
  const before = await object.boundingBox();
  await object.hover();
  await page.mouse.down();
  await page.mouse.move(
    before!.x + before!.width / 2 + 25,
    before!.y + before!.height / 2 + 20,
    { steps: 4 },
  );
  await page.mouse.up();
  await ready(page);
  const after = await object.boundingBox();
  expect(after!.x).toBeGreaterThan(before!.x + 15);
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await page.locator('.editor-paper').click({ position: { x: 80, y: 340 } });
  await page.getByLabel('Link URL').fill('https://informersidea.online');
  await page.getByRole('button', { name: 'Apply object' }).click();
  await ready(page);
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  const canvas = page.getByLabel('Signature drawing area');
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 30, box!.y + 50);
  await page.mouse.down();
  await page.mouse.move(box!.x + 100, box!.y + 80, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Use signature' }).click();
  await page.getByRole('button', { name: 'Apply object' }).click();
  const output = new mupdf.PDFDocument(await exported(page));
  const p = output.loadPage(0);
  expect(p.getLinks().map((l) => l.getURI())).toContain(
    'https://informersidea.online',
  );
  p.destroy();
  output.destroy();
  await page
    .locator('.visual-pdf-editor')
    .screenshot({ path: 'test-results/visual-pdf-desktop.png' });
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('.visual-pdf-editor')
    .screenshot({ path: 'test-results/visual-pdf-mobile.png' });
});
test('rotated pages retain their dimensions and edit in displayed coordinates', async ({
  page,
}) => {
  await open(page, true);
  await page
    .getByRole('button', {
      name: 'Edit existing text: Original headline',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Delete object' }).click();
  const output = await exported(page);
  expect(contents(output)[0]).not.toContain('Original headline');
  expect(contents(output)[0]).toContain('Keep this neighboring line');
  const doc = new mupdf.PDFDocument(output);
  const p = doc.loadPage(0);
  expect(p.getBounds()).toEqual([0, 0, 650, 500]);
  p.destroy();
  doc.destroy();
});

test('individual word editing preserves the other words in the same line', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('Text selection').selectOption('words');
  await page
    .getByRole('button', { name: 'Edit existing text: Original', exact: true })
    .click();
  await page.getByLabel('Text content').fill('Fresh');
  await page.getByRole('button', { name: 'Apply object', exact: true }).click();
  let result = contents(await exported(page));
  expect(result[0]).toContain('Fresh');
  expect(result[0]).not.toContain('Original');
  expect(result[0]).toContain('headline');
  expect(result[0]).toContain('Keep this neighboring line');
  await page.getByLabel('Text selection').selectOption('lines');
  await expect(
    page.getByRole('button', {
      name: 'Edit existing text: Original headline',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel('Text selection').selectOption('words');
  await page
    .getByRole('button', { name: 'Edit existing text: headline', exact: true })
    .click();
  await page.getByLabel('Text content').fill('heading');
  await page.getByRole('button', { name: 'Apply object', exact: true }).click();
  result = contents(await exported(page));
  expect(result[0]).toContain('Fresh');
  expect(result[0]).toContain('heading');
  expect(result[0]).not.toContain('headline');
  expect(result[1]).toContain('Page two untouched');
});

test('uploaded signature keeps its aspect ratio and is embedded in the downloaded PDF', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  const buffer = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 500;
      c.height = 100;
      const x = c.getContext('2d')!;
      x.strokeStyle = '#112244';
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(20, 70);
      x.lineTo(140, 20);
      x.lineTo(300, 60);
      x.stroke();
      return c.toDataURL().split(',')[1];
    }),
    'base64',
  );
  await page
    .getByLabel('Upload signature image')
    .setInputFiles({ name: 'signature.png', mimeType: 'image/png', buffer });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Width (pt)')).toHaveValue('200');
  await expect(page.getByLabel('Height (pt)')).toHaveValue('40');
  await page.getByRole('button', { name: 'Apply object', exact: true }).click();
  const doc = new mupdf.PDFDocument(await exported(page));
  const p = doc.loadPage(0);
  const s = p.toStructuredText('preserve-images');
  const boxes: number[][] = [];
  s.walk({
    onImageBlock(bbox) {
      boxes.push(bbox);
    },
  });
  expect(boxes).toHaveLength(2);
  expect(
    boxes.some(([x, y, r, b]) => Math.abs((r - x) / (b - y) - 5) < 0.01),
  ).toBe(true);
  s.destroy();
  p.destroy();
  doc.destroy();
});
