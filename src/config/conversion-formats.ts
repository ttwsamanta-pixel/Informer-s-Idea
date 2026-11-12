export const formatCategories = [
  'Documents',
  'Images',
  'Audio',
  'Spreadsheets',
  'Archives',
  'Video',
  'Slides',
  'E-books',
  'Vector',
  'CAD',
  'Fonts',
] as const;
export type FormatCategory = (typeof formatCategories)[number];
export interface ConversionFormat {
  id: string;
  category: FormatCategory;
  extensions: string[];
  outputs: string[];
  note?: string;
}
const imageOutputs = ['jpg', 'png', 'webp', 'pdf'];
export const conversionFormats: ConversionFormat[] = [
  {
    id: 'pdf',
    category: 'Documents',
    extensions: ['pdf'],
    outputs: ['jpg', 'png', 'txt', 'docx'],
    note: 'Images export one file per page. TXT and DOCX extract selectable text only; layouts, images and tables are not preserved. Scanned pages need OCR.',
  },
  {
    id: 'docx',
    category: 'Documents',
    extensions: ['docx'],
    outputs: ['pdf', 'txt'],
    note: 'Text-only conversion of the document body. Images, tables, headers, formatting and original page layout are not preserved. PDF supports Latin and Bengali text. Older .doc files are not supported.',
  },
  ...['mp4', 'mov', 'webm'].map((id) => ({
    id,
    category: 'Video' as const,
    extensions: [id],
    outputs: ['mp3', 'wav', 'gif', ...(id === 'mp4' ? [] : ['mp4'])],
    note: 'Up to 40 MB, 2 minutes and Full HD. GIF uses the first 10 seconds at 480px wide. MP4 output is up to 720p. Audio extraction requires an audio track. Engine downloads on first use; files stay on your device.',
  })),
  ...['jpg', 'png', 'webp', 'gif', 'bmp'].map((id) => ({
    id,
    category: 'Images' as const,
    extensions: id === 'jpg' ? ['jpg', 'jpeg', 'jfif'] : [id],
    outputs: imageOutputs.filter((out) => out !== id),
    note:
      id === 'gif'
        ? 'Only the first frame is converted.'
        : 'JPG replaces transparency with white. Original image metadata is removed.',
  })),
  {
    id: 'txt',
    category: 'Documents',
    extensions: ['txt'],
    outputs: ['html', 'gz', 'pdf', 'docx'],
    note: 'PDF and DOCX use a simple text layout. PDF text export supports Latin and Bengali characters.',
  },
  {
    id: 'md',
    category: 'Documents',
    extensions: ['md', 'markdown'],
    outputs: ['txt', 'html'],
    note: 'Markdown is preserved as plain text, not rendered formatting.',
  },
  {
    id: 'html',
    category: 'Documents',
    extensions: ['html', 'htm'],
    outputs: ['txt'],
    note: 'Extracts text without executing scripts or loading external resources.',
  },
  {
    id: 'csv',
    category: 'Spreadsheets',
    extensions: ['csv'],
    outputs: ['tsv', 'json'],
  },
  {
    id: 'tsv',
    category: 'Spreadsheets',
    extensions: ['tsv'],
    outputs: ['csv', 'json'],
  },
  {
    id: 'json',
    category: 'Spreadsheets',
    extensions: ['json'],
    outputs: ['csv', 'tsv'],
    note: 'Use an array of objects with simple values, or an array of rows. Nested objects are not supported.',
  },
  {
    id: 'gz',
    category: 'Archives',
    extensions: ['gz'],
    outputs: ['txt'],
    note: 'Only gzip-compressed UTF-8 text files are supported.',
  },
  ...['mp3', 'm4a', 'ogg', 'flac', 'weba'].map((id) => ({
    id,
    category: 'Audio' as const,
    extensions: [id],
    outputs: ['wav'],
    note: 'Audio decoding depends on your browser and the file’s codec. Output is uncompressed 16-bit WAV.',
  })),
  { id: 'wav', category: 'Audio', extensions: ['wav'], outputs: [] },
];
export const getFormat = (id: string) =>
  conversionFormats.find((f) => f.id === id);
export function detectFormat(name: string) {
  const extension = name.toLowerCase().split('.').pop();
  return conversionFormats.find((f) => f.extensions.includes(extension || ''));
}
