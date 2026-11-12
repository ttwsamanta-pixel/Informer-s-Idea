import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
test('header conversion shortcuts select formats on desktop and mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Converter Tools', exact: true })
    .hover();
  const menu = page.locator('#menu-converter');
  await expect(menu.getByRole('heading')).toHaveText([
    'Image',
    'Document',
    'Audio',
    'Video',
    'Other',
  ]);
  await expect(
    menu.getByRole('link', { name: 'MP4 to MP3', exact: true }),
  ).toHaveAttribute('href', '/converter-tools?from=mp4&to=mp3');
  await menu.getByRole('link', { name: 'MP3 to WAV', exact: true }).click();
  await expect(page.getByLabel('Convert from', { exact: true })).toContainText(
    'MP3',
  );
  await expect(page.getByLabel('Convert to', { exact: true })).toContainText(
    'WAV',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Show Converter Tools' }).click();
  await page
    .locator('#mobile-converter')
    .getByRole('link', { name: 'JPG to PNG', exact: true })
    .click();
  await expect(page.getByLabel('Convert from', { exact: true })).toContainText(
    'JPG',
  );
  await expect(page.getByLabel('Convert to', { exact: true })).toContainText(
    'PNG',
  );
});
async function result(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await pending;
  return {
    name: download.suggestedFilename(),
    bytes: await readFile((await download.path())!),
  };
}
test('converter detects an image, filters outputs, and produces real PDF bytes', async ({
  page,
}) => {
  await page.goto('/converter-tools');
  const uploadRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') uploadRequests.push(request.url());
  });
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 50;
    c.getContext('2d')!.fillRect(0, 0, 80, 50);
    return c.toDataURL().split(',')[1];
  });
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  const select = page.getByLabel('Output for sample.png');
  await expect(select.locator('option')).toHaveText([
    'Select format',
    'PDF',
    'JPG',
    'WEBP',
  ]);
  await select.selectOption('pdf');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toBeVisible();
  const output = await result(page);
  expect(output.name).toBe('sample.pdf');
  expect((await PDFDocument.load(output.bytes)).getPageCount()).toBe(1);
  expect(uploadRequests).toEqual([]);
});
test('PDF text export preserves actual selectable text and scanned PDF errors are visible', async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText('Hello from the converter', { font });
  await page.goto('/converter-tools');
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'hello.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(
    page.getByLabel('Output for hello.pdf').locator('option'),
  ).toHaveText(['Select format', 'TXT', 'DOCX', 'JPG', 'PNG']);
  await page.getByLabel('Output for hello.pdf').selectOption('txt');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toBeVisible();
  expect((await result(page)).bytes.toString()).toContain(
    'Hello from the converter',
  );
  const blank = await PDFDocument.create();
  blank.addPage();
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'blank.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await blank.save()),
  });
  await page.getByLabel('Output for blank.pdf').selectOption('txt');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(page.locator('.convert-error[role=alert]')).toContainText(
    'No selectable text',
  );
});
test('CSV conversion preserves quoted commas, multiline fields, and empty cells', async ({
  page,
}) => {
  await page.goto('/converter-tools');
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'rows.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,note,empty\r\n"A,B","first\nsecond",\r\n'),
  });
  await page.getByLabel('Output for rows.csv').selectOption('json');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toBeVisible();
  expect(JSON.parse((await result(page)).bytes.toString())).toEqual([
    ['name', 'note', 'empty'],
    ['A,B', 'first\nsecond', ''],
  ]);
});
test('gzip roundtrip, unsupported files, category availability and mobile layout', async ({
  page,
}) => {
  const { gzipSync } = await import('node:zlib');
  await page.goto('/converter-tools');
  await page.getByLabel('Choose files to convert').setInputFiles([
    {
      name: 'hello.txt.gz',
      mimeType: 'application/gzip',
      buffer: gzipSync('Hello \u09ac\u09be\u0982\u09b2\u09be'),
    },
    {
      name: 'unsupported.doc',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('not supported'),
    },
  ]);
  await expect(page.locator('.convert-error[role=alert]')).toContainText(
    'not supported yet',
  );
  await page.getByLabel('Output for hello.txt.gz').selectOption('txt');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toBeVisible();
  expect((await result(page)).bytes.toString()).toBe(
    'Hello \u09ac\u09be\u0982\u09b2\u09be',
  );
  await page.getByRole('tab', { name: 'CAD' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('not available');
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/converter-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Convert to', { exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: 'test-results/converter-mobile.png',
    fullPage: true,
  });
});

test('format selectors apply to a batch and ZIP includes both results', async ({
  page,
}) => {
  const { default: JSZip } = await import('jszip');
  await page.goto('/converter-tools');
  await page.getByLabel('Convert from', { exact: true }).click();
  await page
    .locator('.convert-picker[open]')
    .getByRole('button', { name: 'TXT', exact: true })
    .click();
  await page.getByLabel('Convert to', { exact: true }).click();
  await page
    .locator('.convert-picker[open]')
    .getByRole('button', { name: 'HTML', exact: true })
    .click();
  await page.getByLabel('Choose files to convert').setInputFiles([
    {
      name: 'first.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('<script>alert(1)</script>'),
    },
    {
      name: 'second.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Second file'),
    },
  ]);
  await expect(page.getByLabel('Output for first.txt')).toHaveValue('html');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toHaveCount(2);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all', exact: true }).click();
  const downloaded = await pending;
  const zip = await JSZip.loadAsync(await readFile((await downloaded.path())!));
  expect(Object.keys(zip.files)).toHaveLength(2);
  expect(await zip.file('01-first.html')!.async('string')).toContain(
    '&lt;script&gt;',
  );
  expect(await zip.file('02-second.html')!.async('string')).toContain(
    'Second file',
  );
});

test('browser recorded audio converts to a valid PCM WAV', async ({ page }) => {
  await page.goto('/converter-tools');
  await page.getByRole('heading', { level: 1 }).click();
  const data = await page.evaluate(async () => {
    const context = new AudioContext();
    await context.resume();
    const oscillator = context.createOscillator();
    const destination = context.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.connect(context.destination);
    const recorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    const parts: Blob[] = [];
    recorder.ondataavailable = (e) => parts.push(e.data);
    const ended = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    oscillator.start();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    recorder.stop();
    oscillator.stop();
    await ended;
    await context.close();
    return Array.from(new Uint8Array(await new Blob(parts).arrayBuffer()));
  });
  expect(data.length).toBeGreaterThan(200);
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'tone.weba',
    mimeType: 'audio/webm',
    buffer: Buffer.from(data),
  });
  await page.getByLabel('Output for tone.weba').selectOption('wav');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toBeVisible();
  const output = await result(page);
  expect(output.bytes.subarray(0, 4).toString()).toBe('RIFF');
  expect(output.bytes.subarray(8, 12).toString()).toBe('WAVE');
  expect(output.bytes.readUInt16LE(34)).toBe(16);
  expect(output.bytes.length).toBeGreaterThan(44);
});
