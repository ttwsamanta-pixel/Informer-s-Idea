# Browser file converter

The `/converter-tools` category page is now a conversion workspace. Existing individual converter URLs remain available. The header and footer collection links open the workspace.

## Supported conversions

| Input | Output |
| --- | --- |
| JPG/JPEG/JFIF, PNG, WebP, GIF, BMP | JPG, PNG, WebP, PDF (excluding unchanged formats) |
| PDF | JPG or PNG per page, selectable text as TXT |
| TXT | HTML with escaped plain text, GZ |
| Markdown | TXT, HTML containing the original plain text |
| HTML | TXT without scripts or styles |
| CSV, TSV | JSON arrays of rows or the other delimiter format |
| JSON arrays of objects or rows | CSV, TSV |
| Gzip-compressed UTF-8 text | TXT |
| MP3, M4A, OGG, FLAC, WEBA | 16-bit WAV when the browser can decode the source codec |

GIF converts its first frame only. PDF exports allow up to 100 pages. Scanned PDFs need the separate OCR tools. Nested JSON values are rejected. Audio is not transcoded to MP3 or other compressed formats. Browser codec support varies.

Video, slides, e-books, vector, CAD, and fonts are visible catalogue categories, explicitly marked unavailable; no conversion buttons promise support for them. WAV is an output-only format. Catalogue counts describe listed formats, not completed conversions.

## Limits and privacy

- Up to 20 files per batch, 40 MB per file, 100 MB total input.
- Text, delimited data, JSON, and decompressed gzip text are capped at 5 MB.
- Decoded WAV output is capped at 100 MB; decoding itself may need additional memory.
- Images retain the shared canvas limit of 40 million pixels and 12,000 pixels per side.
- Files are processed sequentially in the browser. Nothing is uploaded. Results live in memory until removed or the page is closed.
- Successful outputs can be downloaded separately or packaged into a ZIP. Failed files do not prevent later files from running.
- There is no usage counter, tracking endpoint, database, or developer API section.

The conversion graph in `src/config/conversion-formats.ts` drives both the catalogue and output selectors. Processing checks the same graph before running. Add a tested processor before adding any new advertised conversion.
