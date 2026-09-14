import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('public/workers', { recursive: true });
await copyFile(
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'public/workers/pdf.worker.min.mjs',
);

for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  await cp('node_modules/pdfjs-dist/' + folder, 'public/workers/' + folder, {
    recursive: true,
  });
}
