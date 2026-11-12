import 'regenerator-runtime/runtime';
import { PDFDocument, type PDFFont } from 'pdf-lib';
import JSZip from 'jszip';

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MAX_TEXT = 200_000;
function checkText(text: string) {
  if (!text.trim())
    throw new Error('No text found to convert. Scanned PDFs need OCR first.');
  if (text.length > MAX_TEXT)
    throw new Error('Use a document with fewer than 200,000 text characters.');
}

export async function readDocx(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Check ZIP central-directory sizes before decompressing untrusted documents.
  const view = new DataView(bytes.buffer);
  let entries = 0;
  let size = 0;
  for (let i = 0; i + 46 <= bytes.length; i++) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    entries++;
    size += view.getUint32(i + 24, true);
    if (entries > 2000 || size > 50 * 1024 * 1024)
      throw new Error('This DOCX expands beyond the 50 MB document limit.');
    i +=
      45 +
      view.getUint16(i + 28, true) +
      view.getUint16(i + 30, true) +
      view.getUint16(i + 32, true);
  }
  if (!entries)
    throw new Error(
      'Choose a valid DOCX file. Older DOC files are not supported.',
    );
  const zip = await JSZip.loadAsync(bytes);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('This file is not a Word DOCX document.');
  const xml = await entry.async('string');
  if (xml.length > 5 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('This document XML is too large or unsupported.');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length)
    throw new Error('The DOCX document contains invalid XML.');
  const paragraphs = [...document.getElementsByTagNameNS(WORD_NS, 'p')].map(
    (p) =>
      [...p.getElementsByTagNameNS(WORD_NS, '*')]
        .map((node) =>
          node.localName === 't'
            ? node.textContent || ''
            : node.localName === 'tab'
              ? '\t'
              : ['br', 'cr'].includes(node.localName)
                ? '\n'
                : '',
        )
        .join(''),
  );
  const text = paragraphs.join('\n');
  checkText(text);
  return text;
}

export async function textToDocx(text: string): Promise<Blob> {
  checkText(text);
  const escape = (value: string) =>
    value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${WORD_NS}"><w:body>${text
      .split(/\r?\n/)
      .map(
        (line) =>
          `<w:p><w:r><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`,
      )
      .join(
        '',
      )}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`,
  );
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function textToPDF(
  text: string,
  signal?: AbortSignal,
): Promise<Blob> {
  checkText(text);
  const { default: fontkit } = await import('@pdf-lib/fontkit');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts = await Promise.all(
    ['noto-sans', 'noto-sans-bengali'].map(async (name) => {
      const response = await fetch(`/workers/fonts/${name}.woff`, { signal });
      if (!response.ok)
        throw new Error('Could not load document fonts. Please retry.');
      return pdf.embedFont(await response.arrayBuffer(), { subset: true });
    }),
  );
  const characterSets = fonts.map((font) => new Set(font.getCharacterSet()));
  const runs = (line: string) => {
    const result: { text: string; font: PDFFont }[] = [];
    for (const char of line) {
      const index = characterSets.findIndex((set) =>
        set.has(char.codePointAt(0)!),
      );
      if (index < 0)
        throw new Error(
          'PDF text export currently supports Latin and Bengali text. Use DOCX or TXT for other scripts or symbols.',
        );
      const font = fonts[index];
      if (result.at(-1)?.font === font) result[result.length - 1].text += char;
      else result.push({ text: char, font });
    }
    return result;
  };
  const width = (line: string) =>
    runs(line).reduce(
      (sum, r) => sum + r.font.widthOfTextAtSize(r.text, 11),
      0,
    );
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const draw = (line: string) => {
    if (y < 50) {
      if (pdf.getPageCount() >= 100)
        throw new Error('Text export exceeds the 100-page limit.');
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    let x = 50;
    for (const run of runs(line)) {
      page.drawText(run.text, { x, y, font: run.font, size: 11 });
      x += run.font.widthOfTextAtSize(run.text, 11);
    }
    y -= 18;
  };
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const paragraph of text
    .replace(/\r/g, '')
    .replace(/\t/g, '    ')
    .split('\n')) {
    signal?.throwIfAborted();
    let line = '';
    for (const word of paragraph.split(/(?<=\s)/u)) {
      if (width(line + word) <= 495) {
        line += word;
        continue;
      }
      if (line) {
        draw(line.trimEnd());
        line = '';
      }
      for (const { segment } of segmenter.segment(word)) {
        if (width(line + segment) > 495) {
          draw(line);
          line = '';
        }
        line += segment;
      }
    }
    draw(line.trimEnd());
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  signal?.throwIfAborted();
  return new Blob([new Uint8Array(await pdf.save())], {
    type: 'application/pdf',
  });
}
