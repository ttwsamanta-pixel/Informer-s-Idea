import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { canvasBlob, makeCanvas, cleanName, type Output } from './files';
export interface PDFSettings {
  pages: string;
  rotation: number;
  text: string;
  scale: number;
  quality: number;
  pageSize: string;
  orientation: string;
  margin: number;
  compression: 'lossless' | 'raster';
  editText: string;
  fontSize: number;
  x: number;
  y: number;
  color: string;
}
export const defaultPDFSettings: PDFSettings = {
  pages: '',
  rotation: 90,
  text: 'CONFIDENTIAL',
  scale: 1.5,
  quality: 85,
  pageSize: 'a4',
  orientation: 'portrait',
  margin: 20,
  compression: 'lossless',
  editText: '',
  fontSize: 18,
  x: 36,
  y: 36,
  color: '#111827',
};
export function parsePages(value: string, count: number) {
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i);
  const pages: number[] = [];
  for (const part of value.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Enter page numbers like 1, 3-5, 7.');
    const from = Number(match[1]),
      to = Number(match[2] || match[1]);
    if (from < 1 || to > count || from > to)
      throw new Error(
        `Page numbers must be between 1 and ${count}, with ranges in ascending order.`,
      );
    for (let i = from; i <= to; i++) pages.push(i - 1);
  }
  return [...new Set(pages)];
}
export async function loadPDF(file: File) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: '/workers/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/workers/standard_fonts/',
    wasmUrl: '/workers/wasm/',
  });
  return { document: await task.promise, destroy: () => task.destroy() };
}
export async function renderPDF(
  file: File,
  s: PDFSettings,
  format: string,
  onProgress: (n: number) => void,
): Promise<Output[]> {
  const loaded = await loadPDF(file);
  const pdf = loaded.document;
  try {
    const indexes = parsePages(s.pages, pdf.numPages);
    if (indexes.length > 100)
      throw new Error('Please export up to 100 pages at a time.');
    const results: Output[] = [];
    for (const [i, index] of indexes.entries()) {
      const page = await pdf.getPage(index + 1);
      const viewport = page.getViewport({ scale: s.scale });
      const canvas = makeCanvas(viewport.width, viewport.height);
      await page.render({
        canvas,
        canvasContext: canvas.getContext('2d')!,
        viewport,
      }).promise;
      const blob = await canvasBlob(canvas, 'image/' + format, s.quality / 100);
      results.push({
        blob,
        name: `${cleanName(file.name)}-page-${index + 1}.${format === 'jpeg' ? 'jpg' : 'png'}`,
        detail: `Page ${index + 1} · ${canvas.width} × ${canvas.height} px`,
      });
      page.cleanup();
      onProgress(((i + 1) / indexes.length) * 100);
    }
    return results;
  } finally {
    await loaded.destroy();
  }
}
export async function processPDF(
  files: File[],
  operation: string,
  s: PDFSettings,
  onProgress: (n: number) => void,
): Promise<Output[]> {
  if (operation === 'jpeg' || operation === 'png')
    return renderPDF(files[0], s, operation, onProgress);
  if (operation === 'compress') return compressPDF(files[0], s, onProgress);
  let out = await PDFDocument.create();
  if (operation === 'from-image') {
    for (const [i, file] of files.entries()) {
      const bitmap = await createImageBitmap(file);
      try {
        const canvas = makeCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        const img = await out.embedJpg(
          await (
            await canvasBlob(canvas, 'image/jpeg', s.quality / 100)
          ).arrayBuffer(),
        );
        let pw = s.pageSize === 'letter' ? 612 : 595.28,
          ph = s.pageSize === 'letter' ? 792 : 841.89;
        if (s.pageSize === 'fit') {
          pw = img.width;
          ph = img.height;
        }
        if (s.orientation === 'landscape')
          [pw, ph] = [Math.max(pw, ph), Math.min(pw, ph)];
        const margin = s.pageSize === 'fit' ? 0 : s.margin;
        if (margin * 2 >= Math.min(pw, ph))
          throw new Error('The margin is too large for this page.');
        const scale = Math.min(
          (pw - margin * 2) / img.width,
          (ph - margin * 2) / img.height,
        );
        const page = out.addPage([pw, ph]);
        page.drawImage(img, {
          x: (pw - img.width * scale) / 2,
          y: (ph - img.height * scale) / 2,
          width: img.width * scale,
          height: img.height * scale,
        });
      } finally {
        bitmap.close();
      }
      onProgress(((i + 1) / files.length) * 100);
    }
  } else if (operation === 'merge') {
    for (const [i, file] of files.entries()) {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      const pages = await out.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      onProgress(((i + 1) / files.length) * 100);
    }
  } else {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const selected = parsePages(s.pages, source.getPageCount());
    if (operation === 'metadata' || operation === 'size') {
      const text =
        operation === 'metadata'
          ? JSON.stringify(
              {
                title: source.getTitle() || null,
                author: source.getAuthor() || null,
                subject: source.getSubject() || null,
                keywords: source.getKeywords() || null,
                creator: source.getCreator() || null,
                producer: source.getProducer() || null,
                created: source.getCreationDate()?.toISOString() || null,
                modified: source.getModificationDate()?.toISOString() || null,
                pages: source.getPageCount(),
              },
              null,
              2,
            )
          : source
              .getPages()
              .map(
                (p, i) =>
                  `Page ${i + 1}: ${p.getWidth().toFixed(2)} × ${p.getHeight().toFixed(2)} pt / ${((p.getWidth() * 25.4) / 72).toFixed(2)} × ${((p.getHeight() * 25.4) / 72).toFixed(2)} mm`,
              )
              .join('\n');
      return [
        {
          blob: new Blob([text], { type: 'text/plain' }),
          name: cleanName(files[0].name) + '-' + operation + '.txt',
        },
      ];
    }
    if (['extract', 'delete', 'reverse', 'reorder'].includes(operation)) {
      let indexes = selected;
      if (operation === 'delete') {
        if (!s.pages.trim())
          throw new Error('Enter the page numbers to remove.');
        indexes = source.getPageIndices().filter((i) => !selected.includes(i));
      }
      if (operation === 'reverse') indexes = source.getPageIndices().reverse();
      if (operation === 'reorder' && indexes.length !== source.getPageCount())
        throw new Error('Include each page exactly once when reordering.');
      if (!indexes.length)
        throw new Error('Keep at least one page in your PDF.');
      const copied = await out.copyPages(source, indexes);
      copied.forEach((p) => out.addPage(p));
    } else {
      out = source;
      if (operation === 'edit') {
        if (!s.editText.trim())
          throw new Error('Enter the text you want to add.');
        if (/[^\x20-\x7e\n\r]/.test(s.editText))
          throw new Error(
            'Added text currently supports basic Latin characters only.',
          );
        if (
          !Number.isFinite(s.fontSize) ||
          s.fontSize < 6 ||
          s.fontSize > 144 ||
          !Number.isFinite(s.x) ||
          !Number.isFinite(s.y) ||
          s.x < 0 ||
          s.y < 0
        )
          throw new Error(
            'Use a font size from 6 to 144 and non-negative positions.',
          );
        if (!/^#[0-9a-f]{6}$/i.test(s.color))
          throw new Error('Choose a valid text color.');
        const font = await out.embedFont(StandardFonts.Helvetica);
        const color = rgb(
          ...([1, 3, 5].map(
            (i) => parseInt(s.color.slice(i, i + 2), 16) / 255,
          ) as [number, number, number]),
        );
        const lines = s.editText.replace(/\r/g, '').split('\n');
        for (const index of selected) {
          const page = out.getPage(index);
          if (
            s.y + lines.length * s.fontSize * 1.2 > page.getHeight() ||
            lines.some(
              (line) =>
                s.x + font.widthOfTextAtSize(line, s.fontSize) >
                page.getWidth(),
            )
          )
            throw new Error(
              `Text does not fit on page ${index + 1}. Reduce its size or adjust the position.`,
            );
          page.drawText(lines.join('\n'), {
            x: s.x,
            y: page.getHeight() - s.y - s.fontSize,
            size: s.fontSize,
            lineHeight: s.fontSize * 1.2,
            font,
            color,
          });
        }
      }
      if (operation === 'rotate')
        selected.forEach((i) => {
          const p = out.getPage(i);
          p.setRotation(degrees((p.getRotation().angle + s.rotation) % 360));
        });
      if (operation === 'numbers' || operation === 'watermark') {
        const font = await out.embedFont(StandardFonts.Helvetica);
        if (operation === 'watermark' && /[^\x20-\x7e]/.test(s.text))
          throw new Error(
            'PDF watermark text currently supports basic Latin characters only.',
          );
        out.getPages().forEach((page, i) => {
          const text =
            operation === 'numbers'
              ? `${i + 1} / ${out.getPageCount()}`
              : s.text;
          const size = operation === 'numbers' ? 10 : 32;
          page.drawText(text, {
            font,
            size,
            x: Math.max(
              12,
              (page.getWidth() - font.widthOfTextAtSize(text, size)) / 2,
            ),
            y: operation === 'numbers' ? 18 : page.getHeight() / 2,
            color: rgb(0.35, 0.35, 0.45),
            opacity: operation === 'numbers' ? 1 : 0.25,
          });
        });
      }
      if (operation === 'clean') {
        out.setTitle('');
        out.setAuthor('');
        out.setSubject('');
        out.setKeywords([]);
        out.setCreator('');
        out.setProducer('');
        out.setCreationDate(new Date(0));
        out.setModificationDate(new Date(0));
      }
    }
  }
  const bytes = await out.save();
  onProgress(100);
  return [
    {
      blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      name: operation + '.pdf',
      detail: `${out.getPageCount()} pages`,
    },
  ];
}

async function compressPDF(
  file: File,
  s: PDFSettings,
  onProgress: (n: number) => void,
): Promise<Output[]> {
  let out: PDFDocument;
  if (s.compression === 'lossless') {
    out = await PDFDocument.load(await file.arrayBuffer(), {
      updateMetadata: false,
    });
  } else {
    const loaded = await loadPDF(file);
    out = await PDFDocument.create();
    try {
      if (loaded.document.numPages > 100)
        throw new Error('Please compress up to 100 pages at a time.');
      for (let i = 1; i <= loaded.document.numPages; i++) {
        const page = await loaded.document.getPage(i);
        const size = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: s.scale });
        const canvas = makeCanvas(viewport.width, viewport.height);
        await page.render({
          canvas,
          canvasContext: canvas.getContext('2d')!,
          viewport,
          background: 'white',
        }).promise;
        const jpg = await canvasBlob(canvas, 'image/jpeg', s.quality / 100);
        const image = await out.embedJpg(await jpg.arrayBuffer());
        out
          .addPage([size.width, size.height])
          .drawImage(image, {
            x: 0,
            y: 0,
            width: size.width,
            height: size.height,
          });
        canvas.width = canvas.height = 0;
        page.cleanup();
        onProgress((i / loaded.document.numPages) * 95);
      }
    } finally {
      await loaded.destroy();
    }
  }
  const bytes = await out.save({ useObjectStreams: true });
  const smaller = bytes.length < file.size;
  onProgress(100);
  return [
    {
      blob: smaller
        ? new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
        : file,
      name:
        cleanName(file.name) + (smaller ? '-compressed.pdf' : '-original.pdf'),
      detail: smaller
        ? `${out.getPageCount()} pages · ${(100 * (1 - bytes.length / file.size)).toFixed(1)}% smaller · ${file.size.toLocaleString()} → ${bytes.length.toLocaleString()} bytes`
        : 'This setting did not reduce the file size. Your original PDF is returned unchanged.',
    },
  ];
}
