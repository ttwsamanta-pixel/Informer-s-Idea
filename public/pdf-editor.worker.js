// MuPDF is loaded only in this local worker. No document is sent to a server.
import * as mupdf from './workers/mupdf/mupdf.js';
let source;
const rect = (item) => [
  item.x,
  item.y,
  item.x + item.width,
  item.y + item.height,
];
const bytes = (data) =>
  Uint8Array.from(atob(data.split(',').pop()), (c) => c.charCodeAt(0));
const color = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function inspect(doc, number) {
  const page = doc.loadPage(number);
  const bounds = page.getBounds();
  const items = [];
  const words = [];
  const structured = page.toStructuredText('preserve-images');
  let line, word;
  const finishWord = () => {
    if (word) words.push(word);
    word = null;
  };
  structured.walk({
    beginLine(bbox) {
      line = {
        kind: 'text',
        text: '',
        x: bbox[0],
        y: bbox[1],
        width: bbox[2] - bbox[0],
        height: bbox[3] - bbox[1],
        font: 'Helvetica',
        size: 12,
        color: '#111827',
      };
    },
    onChar(c, origin, font, size, quad, channels) {
      if (!line.text) {
        line.size = size;
        const name = font.getName();
        line.font = /times|serif/i.test(name)
          ? 'Times-Roman'
          : /courier|mono/i.test(name)
            ? 'Courier'
            : 'Helvetica';
        if (/bold/i.test(name))
          line.font =
            line.font === 'Times-Roman' ? 'Times-Bold' : line.font + '-Bold';
        if (channels.length >= 3)
          line.color =
            '#' +
            channels
              .slice(0, 3)
              .map((v) =>
                Math.round(v * 255)
                  .toString(16)
                  .padStart(2, '0'),
              )
              .join('');
      }
      line.text += c;
      if (/\s/u.test(c)) finishWord();
      else {
        const xs = [quad[0], quad[2], quad[4], quad[6]];
        const ys = [quad[1], quad[3], quad[5], quad[7]];
        const x = Math.min(...xs),
          y = Math.min(...ys),
          right = Math.max(...xs),
          bottom = Math.max(...ys);
        if (!word)
          word = {
            ...line,
            text: c,
            x,
            y,
            width: right - x,
            height: bottom - y,
          };
        else {
          const maxX = Math.max(word.x + word.width, right),
            maxY = Math.max(word.y + word.height, bottom);
          word.x = Math.min(word.x, x);
          word.y = Math.min(word.y, y);
          word.width = maxX - word.x;
          word.height = maxY - word.y;
          word.text += c;
        }
      }
    },
    endLine() {
      finishWord();
      if (line.text.trim()) items.push(line);
    },
    onImageBlock(bbox) {
      items.push({
        kind: 'image',
        x: bbox[0],
        y: bbox[1],
        width: bbox[2] - bbox[0],
        height: bbox[3] - bbox[1],
      });
    },
  });
  structured.destroy();
  page.destroy();
  return {
    width: bounds[2] - bounds[0],
    height: bounds[3] - bounds[1],
    words: words.map((item, i) => ({
      ...item,
      id: `${number}-word-${i}`,
      sourceId: `${number}-word-${i}`,
      page: number,
      originalRect: rect(item),
    })),
    items: items.map((item, i) => ({
      ...item,
      id: `${number}-${i}`,
      sourceId: `${number}-${i}`,
      page: number,
      originalRect: rect(item),
    })),
  };
}

function apply(doc, edits, onlyPage) {
  const pages = [...new Set(edits.map((e) => e.page))].filter(
    (p) => onlyPage === undefined || onlyPage === p,
  );
  for (const index of pages) {
    const page = doc.loadPage(index);
    const changes = edits.filter((e) => e.page === index);
    // Recover image pixels before removing the original placement.
    const originals = new Map();
    const wanted = changes.filter(
      (e) => e.kind === 'image' && e.sourceId && !e.data && !e.removed,
    );
    if (wanted.length) {
      const structured = page.toStructuredText('preserve-images');
      structured.walk({
        onImageBlock(bbox, transform, image) {
          const match = wanted.find((e) =>
            e.originalRect.every((v, i) => Math.abs(v - bbox[i]) < 0.1),
          );
          if (match) {
            const pixmap = image.toPixmap();
            originals.set(match.id, new Uint8Array(pixmap.asPNG()));
            pixmap.destroy();
          }
        },
      });
      structured.destroy();
    }
    for (const item of changes.filter((e) => e.originalRect)) {
      const annotation = page.createAnnotation('Redact');
      // A slightly inset text rectangle avoids touching glyphs on adjacent lines.
      const r = [...item.originalRect];
      if (item.kind === 'text') {
        r[1] += 0.5;
        r[3] -= 0.5;
      }
      annotation.setRect(r);
      annotation.update();
      annotation.applyRedaction(
        0,
        item.kind === 'image'
          ? mupdf.PDFPage.REDACT_IMAGE_REMOVE
          : mupdf.PDFPage.REDACT_IMAGE_NONE,
        mupdf.PDFPage.REDACT_LINE_ART_NONE,
        item.kind === 'text'
          ? mupdf.PDFPage.REDACT_TEXT_REMOVE
          : mupdf.PDFPage.REDACT_TEXT_NONE,
      );
      annotation.destroy();
    }
    for (const item of changes.filter((e) => !e.removed)) {
      if (item.kind === 'link') {
        page.createLink(rect(item), item.url);
        continue;
      }
      let annotation;
      if (item.kind === 'image') {
        const data = item.data ? bytes(item.data) : originals.get(item.id);
        if (!data)
          throw new Error(
            'Could not extract this image. Please choose a replacement image.',
          );
        const image = new mupdf.Image(data);
        annotation = page.createAnnotation('Stamp');
        annotation.setStampImage(image);
        annotation.setRect(rect(item));
        image.destroy();
      } else if (item.kind === 'text') {
        annotation = page.createAnnotation('FreeText');
        annotation.setRect(rect(item));
        annotation.setContents(item.text);
        annotation.setDefaultAppearance(
          item.font || 'Helvetica',
          item.size || 16,
          color(item.color || '#111827'),
        );
        annotation.setBorderWidth(0);
        annotation.setColor([]);
      } else {
        annotation = page.createAnnotation(
          item.kind === 'ellipse' ? 'Circle' : 'Square',
        );
        annotation.setRect(rect(item));
        annotation.setColor(color(item.color || '#5440ff'));
        annotation.setBorderWidth(
          item.kind === 'highlight' || item.kind === 'whiteout' ? 0 : 2,
        );
        if (item.kind === 'highlight' || item.kind === 'whiteout') {
          annotation.setInteriorColor(
            color(
              item.kind === 'whiteout' ? '#ffffff' : item.color || '#fff000',
            ),
          );
          annotation.setOpacity(item.kind === 'highlight' ? 0.3 : 1);
        }
      }
      annotation.update();
    }
    page.update();
    page.destroy();
  }
}

self.onmessage = async ({ data }) => {
  const { id, action } = data;
  let doc;
  try {
    if (action === 'open') source = new Uint8Array(data.bytes);
    if (!source) throw new Error('Choose a PDF first.');
    doc = new mupdf.PDFDocument(source);
    if (doc.needsPassword())
      throw new Error('Password-protected PDFs are not supported.');
    if (doc.countPages() > 150)
      throw new Error(
        'Please use a PDF with up to 150 pages in the visual editor.',
      );
    if (action === 'export') {
      apply(doc, data.edits);
      doc.bake(true, false);
      const buffer = doc.saveToBuffer('garbage=4,compress=yes');
      const output = new Uint8Array(buffer.asUint8Array());
      buffer.destroy();
      self.postMessage({ id, output }, [output.buffer]);
    } else {
      const number = data.page || 0;
      const info = inspect(doc, number);
      apply(doc, data.edits || [], number);
      const page = doc.loadPage(number);
      const scale = Math.min(
        data.scale || 1.5,
        1800 / Math.max(info.width, info.height),
      );
      const pixmap = page.toPixmap(
        mupdf.Matrix.scale(scale, scale),
        mupdf.ColorSpace.DeviceRGB,
        false,
      );
      const png = new Uint8Array(pixmap.asPNG());
      pixmap.destroy();
      page.destroy();
      self.postMessage({ id, ...info, count: doc.countPages(), png }, [
        png.buffer,
      ]);
    }
  } catch (error) {
    self.postMessage({
      id,
      error: error.message || 'This PDF could not be processed.',
    });
  } finally {
    doc?.destroy();
  }
};
self.postMessage({ ready: true });
