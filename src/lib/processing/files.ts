export const MAX_FILE_SIZE = 40 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
export function fileSize(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(2)} MB`;
}
export async function validateFiles(
  files: File[],
  kind: 'image' | 'pdf',
  maxFiles = 20,
) {
  if (!files.length) throw new Error('Please choose at least one file.');
  if (files.length > maxFiles)
    throw new Error(`Choose up to ${maxFiles} files at a time.`);
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_SIZE)
    throw new Error('Please keep the total selection under 100 MB.');
  for (const file of files) {
    if (!file.size) throw new Error(`${file.name} is empty.`);
    if (file.size > MAX_FILE_SIZE)
      throw new Error(`${file.name} exceeds the 40 MB file limit.`);
    const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const pdf = String.fromCharCode(...b.slice(0, 5)) === '%PDF-';
    const jpeg = b[0] === 255 && b[1] === 216 && b[2] === 255;
    const png = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
    const webp =
      String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
    const valid =
      kind === 'pdf'
        ? pdf &&
          /\.pdf$/i.test(file.name) &&
          ['', 'application/pdf'].includes(file.type)
        : (jpeg &&
            /\.jpe?g$/i.test(file.name) &&
            ['', 'image/jpeg'].includes(file.type)) ||
          (png &&
            /\.png$/i.test(file.name) &&
            ['', 'image/png'].includes(file.type)) ||
          (webp &&
            /\.webp$/i.test(file.name) &&
            ['', 'image/webp'].includes(file.type));
    if (!valid)
      throw new Error(
        `${file.name} is not a supported ${kind === 'pdf' ? 'PDF' : 'JPG, PNG or WebP'} file. File contents and format must match.`,
      );
  }
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function bundle(results: Output[]) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  results.forEach((r, i) =>
    zip.file(`${String(i + 1).padStart(2, '0')}-${r.name}`, r.blob),
  );
  return zip.generateAsync({ type: 'blob' });
}
export interface Output {
  blob: Blob;
  name: string;
  detail?: string;
  originalSize?: number;
}
export function cleanName(name: string) {
  return (
    name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'result'
  );
}
export function canvasBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(
              new Error(
                'Your browser could not create this image. Try smaller dimensions.',
              ),
            ),
      type,
      quality,
    ),
  );
}
export function makeCanvas(w: number, h: number) {
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w < 1 ||
    h < 1 ||
    w > 12000 ||
    h > 12000 ||
    w * h > 40000000
  )
    throw new Error(
      'Use dimensions between 1 and 12,000 pixels, with at most 40 million total pixels.',
    );
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  return c;
}
export function friendlyError(error: unknown) {
  if (error instanceof Error && /password|encrypt/i.test(error.message))
    return 'This PDF is password-protected. Please use an unencrypted copy.';
  if (
    error instanceof Error &&
    /memory|allocation|out of bounds/i.test(error.message)
  )
    return 'Your browser ran out of memory. Try fewer files or smaller dimensions.';
  if (
    error instanceof Error &&
    /parse|invalid pdf|no pdf header|Failed to load|The source image could not|encoding|undefined|TypeError/i.test(
      error.message,
    )
  )
    return 'This file could not be read. It may be damaged or use an unsupported format. Please try another file.';
  return error instanceof Error
    ? error.message
    : 'We could not process this file. Please try another file.';
}
