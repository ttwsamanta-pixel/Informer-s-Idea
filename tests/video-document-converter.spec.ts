import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

async function download(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  return readFile((await (await pending).path())!);
}
async function run(page: Page, name: string, bytes: Buffer, target: string) {
  await page.getByLabel('Choose files to convert').setInputFiles({
    name,
    buffer: bytes,
    mimeType: name.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/octet-stream',
  });
  await page.getByLabel(`Output for ${name}`).selectOption(target);
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(page.locator('.convert-success, .convert-error')).toBeVisible({
    timeout: 90000,
  });
  await expect(page.locator('.convert-error')).toHaveCount(0);
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toBeVisible();
  return download(page);
}
test('DOCX text converts to PDF and back to editable DOCX', async ({
  page,
}) => {
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello from Word</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:body></w:document>',
  );
  await page.goto('/converter-tools?from=docx&to=pdf');
  await expect(page.getByRole('note')).toContainText('Text-only');
  const pdf = await run(
    page,
    'word.docx',
    await zip.generateAsync({ type: 'nodebuffer' }),
    'pdf',
  );
  expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  await page.goto('/converter-tools?from=pdf&to=docx');
  const docx = await run(page, 'converted.pdf', pdf, 'docx');
  const unpacked = await JSZip.loadAsync(docx);
  expect(unpacked.file('[Content_Types].xml')).toBeTruthy();
  const xml = await unpacked.file('word/document.xml')!.async('string');
  expect(xml).toContain('Hello from Word');
  expect(xml).toContain('Second paragraph');
});
test('text document exports escape XML and paginate PDF', async ({ page }) => {
  await page.goto('/converter-tools?from=txt&to=docx');
  const text = 'বাংলা & <hello>\n' + 'A line of text\n'.repeat(80);
  const docx = await run(page, 'text.txt', Buffer.from(text), 'docx');
  const zip = await JSZip.loadAsync(docx);
  expect(await zip.file('word/document.xml')!.async('string')).toContain(
    'বাংলা &amp; &lt;hello&gt;',
  );
  await page.goto('/converter-tools?from=docx&to=pdf');
  const pdf = await run(page, 'text.docx', docx, 'pdf');
  expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1);
});

let fixture: Buffer;
let extra: Record<string, Buffer>;
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/converter-tools');
  const data = await page.evaluate(async () => {
    const { FFmpeg } = await import(
      location.origin + '/workers/ffmpeg-wrapper/index.js'
    );
    const engine = new FFmpeg();
    await engine.load({
      coreURL: location.origin + '/workers/ffmpeg/ffmpeg-core.js',
      wasmURL: location.origin + '/workers/ffmpeg/ffmpeg-core.wasm',
    });
    try {
      const code = await engine.exec([
        '-f',
        'lavfi',
        '-i',
        'color=c=blue:s=160x120:r=10:d=1',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=1',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-t',
        '1',
        'sample.mp4',
      ]);
      if (code) throw new Error('Fixture generation failed');
      const results: Record<string, number[]> = {
        mp4: Array.from(await engine.readFile('sample.mp4')),
      };
      for (const [name, args] of Object.entries({
        mov: ['-i', 'sample.mp4', '-c', 'copy', 'sample.mov'],
        webm: [
          '-i',
          'sample.mp4',
          '-c:v',
          'libvpx',
          '-c:a',
          'libvorbis',
          'sample.webm',
        ],
        silent: [
          '-i',
          'sample.mp4',
          '-an',
          '-c:v',
          'copy',
          'sample.silent.mp4',
        ],
        long: [
          '-stream_loop',
          '-1',
          '-i',
          'sample.mp4',
          '-t',
          '121',
          '-c',
          'copy',
          'sample.long.mp4',
        ],
      })) {
        if (await engine.exec(args))
          throw new Error('Extra fixture generation failed: ' + name);
        results[name] = Array.from(await engine.readFile(args.at(-1)));
      }
      return results;
    } finally {
      engine.terminate();
    }
  });
  extra = Object.fromEntries(
    Object.entries(data).map(([key, bytes]) => [key, Buffer.from(bytes)]),
  );
  fixture = extra.mp4;
  await page.close();
});
for (const output of ['mp3', 'wav', 'gif', 'mp4']) {
  test(`real video converts to ${output} without uploading`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const requests: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') requests.push(r.url());
    });
    const source = output === 'mp4' ? 'mov' : 'mp4';
    await page.goto(`/converter-tools?from=${source}&to=${output}`);
    const result = await run(page, 'video.' + source, extra[source], output);
    expect(requests).toEqual([]);
    if (output === 'gif')
      expect(result.subarray(0, 6).toString()).toMatch(/^GIF8[79]a$/);
    else if (output === 'wav')
      expect(result.subarray(0, 4).toString()).toBe('RIFF');
    else if (output === 'mp4')
      expect(result.subarray(4, 8).toString()).toBe('ftyp');
    else expect(result.length).toBeGreaterThan(1000);
    if (output === 'mp3' || output === 'wav') {
      const length = await page.evaluate(async (bytes) => {
        const ctx = new AudioContext();
        try {
          return (await ctx.decodeAudioData(new Uint8Array(bytes).buffer))
            .duration;
        } finally {
          await ctx.close();
        }
      }, Array.from(result));
      expect(length).toBeGreaterThan(0.5);
    }
  });
}
test('video cancellation stops work and allows retry', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/converter-tools?from=mp4&to=gif');
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'cancel.mp4',
    buffer: fixture,
    mimeType: 'video/mp4',
  });
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await page.getByRole('button', { name: 'Cancel conversion' }).click();
  await expect(page.locator('.convert-error')).toContainText('cancelled');
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(
    page.getByText('Ready to download', { exact: true }),
  ).toBeVisible({ timeout: 90000 });
});
test('invalid video and DOCX report errors', async ({ page }) => {
  await page.goto('/converter-tools?from=mp4&to=mp3');
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'bad.mp4',
    buffer: Buffer.from('invalid'),
    mimeType: 'video/mp4',
  });
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(page.locator('.convert-error')).toContainText(
    /could not be read|No video track/,
    { timeout: 60000 },
  );
  await page.goto('/converter-tools?from=docx&to=pdf');
  await page.getByLabel('Choose files to convert').setInputFiles({
    name: 'bad.docx',
    buffer: Buffer.from('invalid'),
    mimeType: 'application/octet-stream',
  });
  await page
    .getByRole('button', { name: 'Convert files', exact: true })
    .click();
  await expect(page.locator('.convert-error')).toContainText('valid DOCX');
});

test('WebM conversion and video limits', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/converter-tools?from=webm&to=mp4');
  const mp4 = await run(page, 'clip.webm', extra.webm, 'mp4');
  expect(mp4.subarray(4, 8).toString()).toBe('ftyp');
  for (const [name, message] of [
    ['silent', 'no audio track'],
    ['long', 'up to 2 minutes'],
  ]) {
    await page.goto('/converter-tools?from=mp4&to=mp3');
    await page
      .getByLabel('Choose files to convert')
      .setInputFiles({
        name: name + '.mp4',
        buffer: extra[name],
        mimeType: 'video/mp4',
      });
    await page
      .getByRole('button', { name: 'Convert files', exact: true })
      .click();
    await expect(page.locator('.convert-error')).toContainText(message, {
      timeout: 30000,
    });
  }
});
