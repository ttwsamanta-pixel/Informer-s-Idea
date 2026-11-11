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
    outputs: ['jpg', 'png', 'txt'],
    note: 'Images export one file per page. TXT extracts selectable text; scanned pages need OCR.',
  },
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
    outputs: ['html', 'gz'],
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
