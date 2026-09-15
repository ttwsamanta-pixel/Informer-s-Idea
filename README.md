# Informer's Idea

**Smart Tools for a Smarter You.** A responsive, browser-only online toolkit built with Next.js App Router, TypeScript, React, Tailwind CSS and Lucide icons. The design follows the supplied blue/purple reference and includes a locally recreated SVG bulb logo.

## Run locally

Requires Node.js 22.13 or newer (developed and tested with Node.js 24).

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run lint
npm run build
npm start
```

For a reproducible install use `npm ci`. The postinstall script copies the matching PDF.js worker, fonts, CMaps and WASM assets into `public/workers`. These generated files are ignored by Git and recreated on installation.

## What is included

- 82 working tools and format/preset variants across eight categories. The full inventory is in [docs/TOOLS.md](docs/TOOLS.md), with one URL for each tool.
- Responsive homepage matching the reference's composition, category cards, browser illustration, gradient call-to-action, popular tools, guides, and dark footer.
- Hover mega menus with icon-based tool groups, automatic dismissal, keyboard support and expandable mobile navigation. All Tools lives in the header and footer; a highlighted YouTube menu links both channels using local copies of their channel logos. Keyboard-search dialog (Ctrl/Cmd + K), instant directory search and filters.
- Dark mode, favorites, and recent tools stored locally. User files are never stored in localStorage.
- Drag-and-drop upload, content/type/extension validation, per-file limits, image previews, settings, real progress where available, file download and batch ZIP export.
- Image cropping with a draggable preview, resize with aspect locking and six one-click presets (Passport, PAN, Voter ID, DL, WhatsApp and Instagram), compression, effects, and conversion. Presets use the dimensions supplied in the design reference, set both dimensions and unlock the original ratio; they do not certify official application compliance.
- PDF assembly, page operations, raster export, document information and standard metadata clearing. Compress PDF offers lossless optimization or lossy image-based compression for scans; larger results return the original. Edit PDF is a visual editor with selectable existing words, text lines and images, replacement/deletion, movable text and images, drawn or uploaded signatures, shapes, highlights, whiteout, links, page navigation, zoom and undo/redo. MuPDF runs in a local web worker. Replacements remove original page content; whiteout only covers it. Text is edited by word or line with standard replacement fonts; scanned text and paragraph reflow are not supported. Image-based compression removes selectable text, links, forms and accessibility structure.
- Passport crop positioning, exact mm-to-pixel sizing, embedded DPI metadata, and physically sized A4 PDF sheets.
- Tesseract OCR, genuine QR generation/scanning, on-device background removal, and everyday text/color/number utilities.
- About, contact, privacy, terms, disclaimer, three written guides, 404 and error pages, metadata, sitemap and robots.
- Optional advertising components disabled by default; a future content-provider interface that file processing does not depend on.

## Architecture

`src/config/tools.ts` is the typed registry that drives routing, search, directory cards, category counts, related tools and metadata. `src/config/categories.ts` defines categories. Each tool points to a processor family and operation. Add a definition and processor implementation to add a tool.

UI workspaces live in `src/components/tools`. Processing logic lives in `src/lib/processing`. Heavy tool screens are dynamically loaded; PDF.js, Tesseract, QR libraries and AI models are loaded only when used. PDF.js and Tesseract use workers. Image batches run sequentially to bound memory. No API route receives user files.

## Libraries

Next.js, React, TypeScript, Tailwind CSS, Lucide React, browser-image-compression, pdf-lib, pdfjs-dist, Tesseract.js, qrcode, ZXing browser, JSZip, and IMG.LY background-removal with ONNX Runtime. Native Canvas and Web Crypto handle image editing and secure utility generation. ESLint, Prettier and Playwright support development and validation. Exact versions are pinned in package.json and package-lock.json.

## Browser and processing limits

- JPG, PNG and WebP are validated by file signatures, extension and MIME type. Maximum 40 MB per file, 20 files per batch and 100 MB per selection. Single-document operations accept one file. Canvas output is capped at 40 million pixels and 12,000 px per side.
- JPG/WebP compression is lossy. PNG is lossless and may grow. Target size is best effort. Original metadata is removed when images are re-encoded. JPG output replaces transparent pixels with white.
- PDF raster export accepts up to 100 selected pages. PDF OCR is limited to 30 pages. Some complex PDFs, fonts, forms and annotations may not survive rewriting unchanged. Encrypted PDFs are not supported.
- PDF metadata clearing removes standard information fields, not embedded attachments, XMP, or all potentially sensitive content. It is not a document sanitizer or redaction tool.
- Passport photos are sized, cropped and arranged, not certified. Confirm official requirements. Background fill only fills transparent pixels. Print A4 sheets at 100% / actual size. Physical dimensions are rounded to whole pixels.
- OCR downloads its engine/language data on first use. Background removal downloads an approximately 40 MB model plus runtime files. Asset providers receive normal download requests, but never your chosen files. Initial use requires internet; subsequent behavior depends on browser caching. These tools are not a guarantee of complete offline availability.
- Use a recent Chrome, Edge, Firefox or Safari. AI inference is especially demanding on memory and may work better on desktop. Clipboard access needs a secure context (HTTPS or localhost); manual copy remains available.
- QR codes have no tracking redirect or expiration. Test contrast and scanning before printing. Scanner reads uploaded images, not a live camera feed.
- Contact opens a prefilled GitHub issue for the visitor to review and submit. No message is sent by the website, and no fake subscription/contact backend is included.

## Intentionally excluded

PDF encryption/decryption, secure redaction, HEIC/SVG input conversion, object removal, AI upscaling and remote-service AI tools are not listed as working tools. They require additional compatible implementations, heavier models, or services beyond this phase. There is no user database, server-side file processing, user file storage, ad network, analytics, newsletter service, or AI API key.

## Deployment

Deploy to a host supporting Next.js, for example a Node server or a compatible managed platform. Set `NEXT_PUBLIC_SITE_URL` to your real public origin before building so canonicals, robots and the sitemap use the correct domain. `.env.example` documents the setting. No production domain is assumed. `npm start` serves a previously built app.

The supplied logo is recreated as `public/logo/icon.svg` and a responsive wordmark component. The original raster attachment was visible in the conversation but not supplied as a local asset file.

## Validation

```bash
npx playwright install chromium
npm run build
npm test
```

Playwright starts an isolated production server on port 3100 automatically (override with PLAYWRIGHT_PORT), so a development server on port 3000 does not affect tests. Tests create real images and PDFs and inspect downloaded output dimensions, page counts, DPI and QR decoding. Layout checks cover 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px. OCR and AI tests require access to their public model assets. Screenshots and reports are written to ignored `test-results` and `playwright-report` directories.

## Third-party licensing

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). IMG.LY background-removal is AGPL-3.0 licensed and includes third-party model/runtime terms. Its inclusion matters for distribution and hosted use: retain notices and provide corresponding source as required, or obtain an appropriate commercial license for a proprietary distribution. A source link is included in the website footer. Other dependencies retain their own licenses.
