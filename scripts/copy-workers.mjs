import { mkdir, copyFile, cp, writeFile } from 'node:fs/promises';
await mkdir('public/workers', { recursive: true });
await cp('node_modules/mupdf/dist', 'public/workers/mupdf', {
  recursive: true,
});
await copyFile(
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'public/workers/pdf.worker.min.mjs',
);
// Hostinger's static layer serves .mjs as text/plain. Keep module code unchanged
// under a .js URL so browsers receive a JavaScript MIME type.
await copyFile(
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'public/workers/pdf.worker.min.js',
);

for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  await cp('node_modules/pdfjs-dist/' + folder, 'public/workers/' + folder, {
    recursive: true,
  });
}

await cp(
  'node_modules/@ffmpeg/ffmpeg/dist/esm',
  'public/workers/ffmpeg-wrapper',
  { recursive: true },
);
await cp('node_modules/@ffmpeg/core/dist/esm', 'public/workers/ffmpeg', {
  recursive: true,
});
await copyFile(
  'licenses/FFMPEG-GPL-2.0.txt',
  'public/workers/ffmpeg/COPYING.GPLv2',
);
await copyFile(
  'licenses/FFMPEG-WRAPPER-MIT.txt',
  'public/workers/ffmpeg-wrapper/LICENSE.txt',
);
await writeFile(
  'public/workers/ffmpeg/NOTICE.txt',
  `Unmodified @ffmpeg/core 0.12.10 (GPL-2.0-or-later) and @ffmpeg/ffmpeg 0.12.15 (MIT).
Copyright FFmpeg developers and Jerome Wu / ffmpeg.wasm contributors.
GPL license: ./COPYING.GPLv2
Wrapper license: ../ffmpeg-wrapper/LICENSE.txt
Upstream source and reproducible build scripts: https://github.com/ffmpegwasm/ffmpeg.wasm
Core FFmpeg source: https://github.com/ffmpegwasm/ffmpeg.wasm-core
FFmpeg 5.1.4 upstream source: https://github.com/FFmpeg/FFmpeg/tree/n5.1.4
Enabled codec-library sources and build configuration: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/build
Application source: https://github.com/ttwsamanta-pixel/Informer-s-Idea
`,
);
await mkdir('public/workers/fonts', { recursive: true });
for (const [family, subset] of [
  ['noto-sans', 'latin'],
  ['noto-sans-bengali', 'bengali'],
]) {
  await copyFile(
    `node_modules/@fontsource/${family}/files/${family}-${subset}-400-normal.woff`,
    `public/workers/fonts/${family}.woff`,
  );
  await copyFile(
    `node_modules/@fontsource/${family}/LICENSE`,
    `public/workers/fonts/${family}-LICENSE.txt`,
  );
}
