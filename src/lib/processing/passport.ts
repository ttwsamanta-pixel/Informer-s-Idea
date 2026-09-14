import { PDFDocument } from 'pdf-lib';
import { canvasBlob, makeCanvas, cleanName, type Output } from './files';
export interface PassportSettings {
  width: number;
  height: number;
  dpi: number;
  zoom: number;
  x: number;
  y: number;
  format: string;
  background: string;
  copies: number;
}
export const defaultPassportSettings: PassportSettings = {
  width: 35,
  height: 45,
  dpi: 300,
  zoom: 1,
  x: 50,
  y: 50,
  format: 'jpeg',
  background: '#ffffff',
  copies: 12,
};
// Write JPEG JFIF density or PNG pHYs density so physical dimensions survive download.
export async function withDPI(blob: Blob, dpi: number): Promise<Blob> {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === 'image/jpeg') {
    if (b[6] === 74 && b[7] === 70 && b[8] === 73 && b[9] === 70) {
      b[13] = 1;
      b[14] = dpi >> 8;
      b[15] = dpi & 255;
      b[16] = dpi >> 8;
      b[17] = dpi & 255;
    }
    return new Blob([b], { type: blob.type });
  }
  if (blob.type === 'image/png') {
    const chunk = new Uint8Array(21);
    const v = new DataView(chunk.buffer);
    v.setUint32(0, 9);
    chunk.set([112, 72, 89, 115], 4);
    v.setUint32(8, Math.round(dpi / 0.0254));
    v.setUint32(12, Math.round(dpi / 0.0254));
    chunk[16] = 1;
    let crc = 0xffffffff;
    for (const byte of chunk.slice(4, 17)) {
      crc ^= byte;
      for (let k = 0; k < 8; k++)
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    v.setUint32(17, (crc ^ 0xffffffff) >>> 0);
    const pieces: Uint8Array[] = [b.slice(0, 33), chunk];
    let pos = 33;
    while (pos < b.length) {
      const len = new DataView(b.buffer, b.byteOffset + pos, 4).getUint32(0);
      if (String.fromCharCode(...b.slice(pos + 4, pos + 8)) !== 'pHYs')
        pieces.push(b.slice(pos, pos + 12 + len));
      pos += 12 + len;
    }
    return new Blob(pieces as BlobPart[], { type: blob.type });
  }
  return blob;
}
export async function createPassport(
  file: File,
  s: PassportSettings,
  sheet = false,
): Promise<Output[]> {
  const bitmap = await createImageBitmap(file);
  try {
    if (s.width <= 0 || s.height <= 0 || s.dpi < 72 || s.dpi > 600)
      throw new Error('Use positive dimensions and a DPI between 72 and 600.');
    const canvas = makeCanvas(
      (s.width / 25.4) * s.dpi,
      (s.height / 25.4) * s.dpi,
    );
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale =
      Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height) *
      s.zoom;
    ctx.drawImage(
      bitmap,
      ((canvas.width - bitmap.width * scale) * s.x) / 100,
      ((canvas.height - bitmap.height * scale) * s.y) / 100,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    const blob = await withDPI(
      await canvasBlob(canvas, 'image/' + s.format, 0.95),
      s.dpi,
    );
    const output: Output[] = [
      {
        blob,
        name:
          cleanName(file.name) +
          `-${s.width}x${s.height}mm.${s.format === 'jpeg' ? 'jpg' : s.format}`,
        detail: `${canvas.width} × ${canvas.height} px · ${s.width} × ${s.height} mm · ${s.dpi} DPI`,
      },
    ];
    if (sheet) {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595.28, 841.89]);
      const jpg = await canvasBlob(canvas, 'image/jpeg', 0.98);
      const img = await pdf.embedJpg(await jpg.arrayBuffer());
      const w = (s.width * 72) / 25.4,
        h = (s.height * 72) / 25.4,
        gap = 10,
        margin = 24,
        cols = Math.floor((page.getWidth() - margin * 2 + gap) / (w + gap)),
        rows = Math.floor((page.getHeight() - margin * 2 + gap) / (h + gap));
      if (cols < 1 || rows < 1)
        throw new Error('This photo size does not fit on an A4 sheet.');
      const count = Math.min(s.copies, cols * rows);
      for (let i = 0; i < count; i++)
        page.drawImage(img, {
          x: margin + (i % cols) * (w + gap),
          y: page.getHeight() - margin - h - Math.floor(i / cols) * (h + gap),
          width: w,
          height: h,
        });
      output.push({
        blob: new Blob([new Uint8Array(await pdf.save())], {
          type: 'application/pdf',
        }),
        name: 'passport-photo-sheet-a4.pdf',
        detail: `${count} photos · A4 · Print at actual size (100%)`,
      });
    }
    return output;
  } finally {
    bitmap.close();
  }
}
