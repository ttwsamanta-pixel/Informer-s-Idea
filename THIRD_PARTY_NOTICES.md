# Third-party notices

This project uses open-source libraries; their full license texts are distributed with their npm packages.

- Next.js, React, Tailwind CSS, browser-image-compression, pdf-lib, qrcode and JSZip: MIT (JSZip also offers GPL terms).
- Lucide: ISC.
- PDF.js and Tesseract.js: Apache-2.0.
- ZXing browser: MIT; its underlying ZXing library retains its own license.
- IMG.LY background-removal: GNU Affero General Public License v3. See `licenses/IMG-LY-AGPL-3.0.md` and the package's `ThirdPartyLicenses.json`. ONNX Runtime and downloaded model assets retain their own terms.

Do not remove copyright or license notices from distributed dependencies. The AI library's AGPL terms apply to its use and distribution; consult the original license for corresponding-source requirements. Project source: https://github.com/ttwsamanta-pixel/Informer-s-Idea.

- MuPDF 1.28.1 (Artifex Software): AGPL-3.0-or-later. See `licenses/MUPDF-LICENSE.txt`. Browser engine files are copied unchanged from the pinned npm package during installation. Upstream corresponding source: https://github.com/ArtifexSoftware/mupdf.js and https://github.com/ArtifexSoftware/mupdf. Application source: https://github.com/ttwsamanta-pixel/Informer-s-Idea.

- `@ffmpeg/ffmpeg` 0.12.15: MIT. `@ffmpeg/core` 0.12.10: GPL-2.0-or-later, including FFmpeg and enabled codec libraries with their own terms. Core and wrapper worker assets are copied unchanged from the pinned packages. Upstream source, build scripts and dependency versions: https://github.com/ffmpegwasm/ffmpeg.wasm; FFmpeg core source: https://github.com/ffmpegwasm/ffmpeg.wasm-core. Package source/build references and license texts are served at `/workers/ffmpeg/NOTICE.txt`.
- `@pdf-lib/fontkit` 1.1.1: MIT (based on fontkit). Source: https://github.com/Hopding/fontkit.
- Noto Sans and Noto Sans Bengali from `@fontsource` 5.3.0: SIL Open Font License 1.1. Unmodified Latin and Bengali WOFF subsets are copied for document PDF export. Full copyright/license notices accompany them in `/workers/fonts/`.

- `regenerator-runtime` 0.14.1: MIT. Used by the font shaping engine for document text export.

## CKEditor 5 (admin content editor)

CKEditor 5 and its React integration are self-hosted. The editor uses the free GPL configuration (`licenseKey: 'GPL'`) and standard features only. CKEditor 5 is licensed under GPL-2.0-or-later or a commercial license. Using the free edition requires compliance with its GPL terms; this notice does not relicense the application or establish that the entire project is GPL-compatible. A commercial license key can instead be provided through `NEXT_PUBLIC_CKEDITOR_LICENSE_KEY` before building.

Official licensing information: https://ckeditor.com/docs/ckeditor5/latest/getting-started/licensing/license-and-legal.html

Image processing uses sharp (Apache-2.0); rich HTML is sanitized with sanitize-html (MIT). Package license texts are included in their installed packages.
