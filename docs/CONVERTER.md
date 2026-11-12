# Browser file converter

The `/converter-tools` category page is now a conversion workspace. Existing individual converter URLs remain available. The header and footer collection links open the workspace.

## Supported conversions

| Input | Output |
| --- | --- |
| JPG/JPEG/JFIF, PNG, WebP, GIF, BMP | JPG, PNG, WebP, PDF (excluding unchanged formats) |
| PDF | JPG or PNG per page, selectable text as TXT or DOCX (text-only) |
| TXT | HTML with escaped plain text, GZ, PDF, DOCX |
| DOCX | PDF or TXT (document-body text only) |
| MP4, MOV, WebM | MP3, WAV, GIF; MOV/WebM also to MP4 |
| Markdown | TXT, HTML containing the original plain text |
| HTML | TXT without scripts or styles |
| CSV, TSV | JSON arrays of rows or the other delimiter format |
| JSON arrays of objects or rows | CSV, TSV |
| Gzip-compressed UTF-8 text | TXT |
| MP3, M4A, OGG, FLAC, WEBA | 16-bit WAV when the browser can decode the source codec |

GIF converts its first frame only. PDF exports allow up to 100 pages. Scanned PDFs need the separate OCR tools. Nested JSON values are rejected. Audio is not transcoded to MP3 or other compressed formats. Browser codec support varies.

Slides, e-books, vector, CAD, and fonts are visible catalogue categories, explicitly marked unavailable; no conversion buttons promise support for them. WAV is an output-only format. Catalogue counts describe listed formats, not completed conversions.

## Limits and privacy

- Up to 20 files per batch, 40 MB per file, 100 MB total input.
- Text, delimited data, JSON, and decompressed gzip text are capped at 5 MB.
- Decoded WAV output is capped at 100 MB; decoding itself may need additional memory.
- Images retain the shared canvas limit of 40 million pixels and 12,000 pixels per side.
- Files are processed sequentially in the browser. Nothing is uploaded. Results live in memory until removed or the page is closed.
- Successful outputs can be downloaded separately or packaged into a ZIP. Failed files do not prevent later files from running.
- There is no usage counter, tracking endpoint, database, or developer API section.

The conversion graph in `src/config/conversion-formats.ts` drives both the catalogue and output selectors. Processing checks the same graph before running. Add a tested processor before adding any new advertised conversion.

## Video conversion

The single-threaded `@ffmpeg/core` engine is loaded from this site's `/workers/` assets only when a video conversion starts. No third-party API, account, or file upload is involved. First use downloads about 32 MB of engine assets. The worker is terminated after each video, on cancellation, on navigation away, or after three minutes; batches stop when cancelled. Inputs must have readable duration metadata, be at most 40 MB, 120 seconds, and 1920x1080 pixels (portrait equivalent accepted). Some codecs cannot be decoded.

MP4 output uses H.264/AAC, up to 1280x720 at 30 fps, preserving aspect ratio. MP3 uses 128 kbps, WAV uses stereo 44.1 kHz PCM. Audio export rejects videos without audio. GIF exports the first ten seconds at 10 fps and 480 pixels wide. Output above 100 MB is rejected. These limits do not guarantee success on low-memory phones.

## Word and text documents

DOCX to PDF/TXT extracts document-body paragraph text. Images, tables as tables, headers, footers, tracked-change semantics, original page layout and formatting are not preserved. Legacy binary DOC is not supported. PDF to DOCX extracts selectable text into editable paragraphs; scanned PDFs need OCR first. Exports have a 200,000-character limit. DOCX ZIP directory expansion is limited to 50 MB and 2,000 entries; main document XML is limited to 5 MB.

Text PDFs use embedded Noto Sans / Noto Sans Bengali fonts, A4 pages and a simple wrapped layout (maximum 100 pages). Unsupported glyphs produce an explicit error rather than replacement characters. DOCX text output supports Unicode. Scripts and external links in uploaded documents are never executed or fetched.
