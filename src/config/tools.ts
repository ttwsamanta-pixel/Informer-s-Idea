import { categories, type CategoryId } from './categories';
import type { ToolDefinition, Processor } from '@/types/tools';
type Entry = [string, string, string, string?];
const groups: {
  category: CategoryId;
  processor: Processor;
  entries: Entry[];
}[] = [
  {
    category: 'image',
    processor: 'image',
    entries: [
      [
        'compress-image',
        'Compress Image',
        'Make JPG, PNG and WebP files smaller.',
        'compress',
      ],
      [
        'resize-image',
        'Resize Image',
        'Get the perfect width and height.',
        'resize',
      ],
      ['crop-image', 'Crop Image', 'Keep just the part that matters.', 'crop'],
      [
        'rotate-image',
        'Rotate Image',
        'Turn your photos to the right angle.',
        'rotate',
      ],
      [
        'flip-image',
        'Flip Image',
        'Mirror an image horizontally or vertically.',
        'flip',
      ],
      [
        'convert-image',
        'Convert Image',
        'Save images as JPG, PNG or WebP.',
        'convert',
      ],
      [
        'bulk-image-compressor',
        'Bulk Image Compressor',
        'Compress multiple images and download a ZIP.',
        'compress',
      ],
      [
        'bulk-image-resizer',
        'Bulk Image Resizer',
        'Resize an entire batch in one go.',
        'resize',
      ],
      [
        'grayscale-image',
        'Grayscale Image',
        'Create a classic black and white image.',
        'grayscale',
      ],
      ['blur-image', 'Blur Image', 'Apply a soft blur to your photo.', 'blur'],
      [
        'brightness-adjuster',
        'Brightness Adjuster',
        'Make your photos brighter or darker.',
        'brightness',
      ],
      [
        'contrast-adjuster',
        'Contrast Adjuster',
        'Fine-tune light and dark tones.',
        'contrast',
      ],
      [
        'image-watermark',
        'Image Watermark',
        'Add a text watermark to your images.',
        'text',
      ],
      [
        'add-text-to-image',
        'Add Text to Image',
        'Put your words on your pictures.',
        'text',
      ],
      [
        'remove-metadata',
        'Remove Image Metadata',
        'Re-encode an image without original EXIF metadata.',
        'convert',
      ],
    ],
  },
  {
    category: 'converter',
    processor: 'image',
    entries: [
      ['jpg-to-png', 'JPG to PNG', 'Convert JPG images to PNG.', 'png'],
      ['png-to-jpg', 'PNG to JPG', 'Convert PNG images to JPG.', 'jpeg'],
      [
        'jpg-to-webp',
        'JPG to WebP',
        'Convert JPG images to modern WebP.',
        'webp',
      ],
      ['png-to-webp', 'PNG to WebP', 'Convert PNG images to WebP.', 'webp'],
      [
        'webp-to-jpg',
        'WebP to JPG',
        'Make WebP images widely compatible.',
        'jpeg',
      ],
      ['webp-to-png', 'WebP to PNG', 'Convert WebP images to PNG.', 'png'],
    ],
  },
  {
    category: 'pdf',
    processor: 'pdf',
    entries: [
      [
        'compress-pdf',
        'Compress PDF',
        'Reduce PDF size with lossless or image-based compression.',
        'compress',
      ],
      [
        'edit-pdf',
        'Edit PDF',
        'Add text to selected PDF pages with size, color and position controls.',
        'edit',
      ],
      [
        'merge-pdf',
        'Merge PDF',
        'Bring multiple PDFs together in one file.',
        'merge',
      ],
      [
        'split-pdf',
        'Split PDF',
        'Save selected pages as a new PDF.',
        'extract',
      ],
      ['rotate-pdf', 'Rotate PDF', 'Rotate selected pages of a PDF.', 'rotate'],
      [
        'delete-pdf-pages',
        'Delete PDF Pages',
        'Remove unwanted pages from your PDF.',
        'delete',
      ],
      [
        'extract-pdf-pages',
        'Extract PDF Pages',
        'Keep only the pages you need.',
        'extract',
      ],
      [
        'reverse-pdf-pages',
        'Reverse PDF Pages',
        'Reverse the order of every page.',
        'reverse',
      ],
      [
        'reorder-pdf-pages',
        'Reorder PDF Pages',
        'Put pages into your preferred order.',
        'reorder',
      ],
      [
        'pdf-to-jpg',
        'PDF to JPG',
        'Turn PDF pages into high-quality images.',
        'jpeg',
      ],
      [
        'pdf-to-png',
        'PDF to PNG',
        'Export PDF pages as lossless PNG images.',
        'png',
      ],
      [
        'image-to-pdf',
        'Image to PDF',
        'Turn your images into a PDF document.',
        'from-image',
      ],
      [
        'jpg-to-pdf',
        'JPG to PDF',
        'Combine JPG photos in a PDF.',
        'from-image',
      ],
      ['png-to-pdf', 'PNG to PDF', 'Put PNG images into a PDF.', 'from-image'],
      [
        'add-page-numbers',
        'Add Page Numbers',
        'Number the pages of your PDF.',
        'numbers',
      ],
      [
        'pdf-watermark',
        'PDF Watermark',
        'Add a text watermark to every page.',
        'watermark',
      ],
      [
        'pdf-metadata-viewer',
        'PDF Metadata Viewer',
        'Inspect document properties.',
        'metadata',
      ],
      [
        'remove-pdf-metadata',
        'Remove PDF Metadata',
        'Clear standard document information fields.',
        'clean',
      ],
      [
        'pdf-page-size-checker',
        'PDF Page Size Checker',
        'Check the dimensions of every PDF page.',
        'size',
      ],
    ],
  },
  {
    category: 'passport',
    processor: 'passport',
    entries: [
      [
        'passport-photo-maker',
        'Passport Photo Maker',
        'Create a precisely sized passport photo.',
        'photo',
      ],
      [
        'visa-photo-maker',
        'Visa Photo Maker',
        'Set the dimensions required for your visa.',
        'photo',
      ],
      [
        '2x2-photo-maker',
        '2 × 2 Photo Maker',
        'Create a 2 × 2 inch photo at your chosen DPI.',
        '2x2',
      ],
      [
        '35x45-mm-photo',
        '35 × 45 mm Photo',
        'Size your portrait to exactly 35 × 45 mm.',
        'photo',
      ],
      [
        'indian-passport-photo',
        'Indian Passport Photo',
        'Create a 2 × 2 inch passport-sized photo.',
        '2x2',
      ],
      [
        'id-photo-maker',
        'ID Photo Maker',
        'Make a custom-sized identification photo.',
        'photo',
      ],
      [
        'signature-resize',
        'Signature Resize',
        'Resize a scanned signature to exact dimensions.',
        'signature',
      ],
      [
        'photo-sheet-generator',
        'Photo Sheet Generator',
        'Arrange your portraits on a print-ready A4 sheet.',
        'sheet',
      ],
      [
        'multiple-passport-photos-on-a4',
        'Passport Photos on A4',
        'Create a sheet of correctly sized photo copies.',
        'sheet',
      ],
    ],
  },
  {
    category: 'passport',
    processor: 'signature',
    entries: [
      [
        'signature-maker',
        'Signature Maker',
        'Draw and download your signature.',
        'signature',
      ],
    ],
  },
  {
    category: 'ocr',
    processor: 'ocr',
    entries: [
      [
        'image-to-text',
        'Image to Text',
        'Extract editable text from an image.',
      ],
      ['jpg-to-text', 'JPG to Text', 'Read text from your JPG photographs.'],
      ['png-to-text', 'PNG to Text', 'Extract text from a PNG image.'],
      [
        'screenshot-to-text',
        'Screenshot to Text',
        'Copy the text inside a screenshot.',
      ],
      ['pdf-ocr', 'PDF OCR', 'Recognize text from scanned PDF pages.', 'pdf'],
    ],
  },
  {
    category: 'qr',
    processor: 'qr',
    entries: [
      [
        'qr-code-generator',
        'QR Code Generator',
        'Turn a link or text into a QR code.',
        'text',
      ],
      [
        'url-qr-generator',
        'URL QR Generator',
        'Share a website with a quick scan.',
        'url',
      ],
      [
        'text-qr-generator',
        'Text QR Generator',
        'Share any message as a QR code.',
        'text',
      ],
      [
        'wifi-qr-generator',
        'WiFi QR Generator',
        'Let guests join your WiFi with a scan.',
        'wifi',
      ],
      [
        'email-qr-generator',
        'Email QR Generator',
        'Make it easy to start an email.',
        'email',
      ],
      [
        'phone-qr-generator',
        'Phone QR Generator',
        'Start a phone call with a scan.',
        'phone',
      ],
      [
        'sms-qr-generator',
        'SMS QR Generator',
        'Prepare a text message in a QR code.',
        'sms',
      ],
      [
        'vcard-qr-generator',
        'vCard QR Generator',
        'Share your contact details.',
        'vcard',
      ],
      [
        'location-qr-generator',
        'Location QR Generator',
        'Share map coordinates with a scan.',
        'location',
      ],
    ],
  },
  {
    category: 'qr',
    processor: 'scanner',
    entries: [
      [
        'qr-code-scanner',
        'QR Code Scanner',
        'Read QR codes from an image on your device.',
        'scan',
      ],
    ],
  },
  {
    category: 'ai',
    processor: 'background',
    entries: [
      [
        'remove-background',
        'Remove Background',
        'Remove a photo background with an on-device AI model.',
        'background',
      ],
    ],
  },
  {
    category: 'utility',
    processor: 'utility',
    entries: [
      [
        'color-picker',
        'Color Picker',
        'Explore a color and copy its HEX and RGB values.',
        'color',
      ],
      ['hex-to-rgb', 'HEX to RGB', 'Convert a HEX color to RGB.', 'hex'],
      ['rgb-to-hex', 'RGB to HEX', 'Convert RGB values to a HEX color.', 'rgb'],
      [
        'json-formatter',
        'JSON Formatter',
        'Validate and neatly format your JSON.',
        'json',
      ],
      [
        'json-validator',
        'JSON Validator',
        'Check that your JSON is valid.',
        'json',
      ],
      [
        'base64-encoder',
        'Base64 Encoder',
        'Encode Unicode text as Base64.',
        'encode',
      ],
      [
        'base64-decoder',
        'Base64 Decoder',
        'Decode Base64 back into readable text.',
        'decode',
      ],
      [
        'uuid-generator',
        'UUID Generator',
        'Generate cryptographically random UUIDs.',
        'uuid',
      ],
      [
        'password-generator',
        'Password Generator',
        'Create secure random passwords locally.',
        'password',
      ],
      [
        'lorem-ipsum-generator',
        'Lorem Ipsum Generator',
        'Generate sample text for your next design.',
        'lorem',
      ],
      [
        'text-counter',
        'Text Counter',
        'Count words, characters and lines.',
        'count',
      ],
      [
        'word-counter',
        'Word Counter',
        'See the word count of your text.',
        'count',
      ],
      [
        'character-counter',
        'Character Counter',
        'Count characters, including and excluding spaces.',
        'count',
      ],
      [
        'case-converter',
        'Case Converter',
        'Change text to upper, lower or title case.',
        'case',
      ],
      [
        'timestamp-converter',
        'Timestamp Converter',
        'Convert Unix timestamps and dates.',
        'timestamp',
      ],
      [
        'unit-converter',
        'Unit Converter',
        'Convert length, weight and temperature.',
        'unit',
      ],
    ],
  },
];
const popular = [
  'compress-image',
  'resize-image',
  'pdf-to-jpg',
  'merge-pdf',
  'passport-photo-maker',
  'remove-background',
  'qr-code-generator',
  'image-to-pdf',
];
export const tools: ToolDefinition[] = groups.flatMap((group) =>
  group.entries.map(([slug, name, description, operation]) => ({
    id: slug,
    slug,
    name,
    shortDescription: description,
    longDescription:
      description + ' Free, private, and processed right in your browser.',
    category: group.category,
    icon: categories.find((c) => c.id === group.category)!.icon,
    acceptedFormats: ['qr', 'utility', 'signature'].includes(group.processor)
      ? []
      : (group.processor === 'pdf' && operation !== 'from-image') ||
          operation === 'pdf'
        ? ['application/pdf']
        : ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles:
      group.processor === 'image' ||
      (group.processor === 'pdf' &&
        ['merge', 'from-image'].includes(operation || ''))
        ? 20
        : 1,
    browserOnly: true as const,
    keywords: [
      name.toLowerCase(),
      group.category,
      operation || name.toLowerCase(),
    ],
    relatedTools: [],
    processor: group.processor,
    component: group.processor,
    seoTitle: name + " Online Free | Informer's Idea",
    seoDescription:
      description +
      ' Free browser-based processing. Your files stay on your device.',
    popular: popular.includes(slug),
    featured: popular.includes(slug),
    operation: operation || 'image',
    format: ['png', 'jpeg', 'webp'].includes(operation || '')
      ? operation
      : undefined,
  })),
);
for (const tool of tools)
  tool.relatedTools = tools
    .filter((t) => t.category === tool.category && t.id !== tool.id)
    .slice(0, 4)
    .map((t) => t.slug);
export const findTool = (slug: string) => tools.find((t) => t.slug === slug);
export const searchTools = (query: string) =>
  tools.filter((t) =>
    [t.name, t.shortDescription, t.category, ...t.keywords]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
