export const articles = [
  {
    slug: 'compress-images-without-losing-quality',
    category: 'IMAGE TOOLS',
    title: 'Smaller files. Same big impression.',
    description:
      'A practical guide to compressing images without sacrificing the details.',
    minutes: 5,
    tool: 'compress-image',
    sections: [
      [
        'Start with the right format',
        'Use JPG for photographs, PNG for transparency and crisp graphics, and WebP for a balance of small size and quality. PNG is lossless; lowering a quality slider does not reduce PNG quality or reliably shrink its size.',
      ],
      [
        'Find your quality sweet spot',
        'For JPG and WebP, start around 80% quality. Download and inspect fine details at full size. Lower the quality gradually if you need a smaller file.',
      ],
      [
        'Resize before you compress',
        'A 6000-pixel photo is usually larger than a website needs. Resize it to the display dimensions first. Keep your original file so you can return to it later.',
      ],
    ],
  },
  {
    slug: 'merge-pdf-files-online',
    category: 'PDF TOOLS',
    title: 'One PDF. Everything in order.',
    description:
      'Combine your documents into a single, organized PDF in a few clicks.',
    minutes: 4,
    tool: 'merge-pdf',
    sections: [
      [
        'Choose your documents',
        'Open Merge PDF and select your PDF files. You can add up to 20 files within the displayed size limit. Password-protected files need to be decrypted before use.',
      ],
      [
        'Put them in order',
        'Use the up and down controls beside your files to arrange them. The output follows the file list from top to bottom and keeps the page order inside each document.',
      ],
      [
        'Merge and save',
        'Choose Merge PDF, wait for the result, and download the combined file. Your documents are processed in your browser and are never uploaded.',
      ],
    ],
  },
  {
    slug: 'passport-photo-size-guide',
    category: 'TIPS & TRICKS',
    title: 'Your passport photo, perfectly sized.',
    description:
      'Understand dimensions, DPI, and print sheets before your next application.',
    minutes: 6,
    tool: 'passport-photo-maker',
    sections: [
      [
        'Check the official requirements',
        'Photo requirements vary by issuing authority and application type. Confirm the required physical size, background, head position and recency before preparing your photo. Our tools size images; they do not certify acceptance.',
      ],
      [
        'Physical size and DPI',
        'Pixels equal millimeters divided by 25.4, multiplied by DPI. A 35 × 45 mm photo at 300 DPI is approximately 413 × 531 pixels. Rounding to whole pixels is unavoidable.',
      ],
      [
        'Print at actual size',
        'Use Photo Sheet Generator to place copies on an A4 page. Print at 100% or actual size; turn off fit-to-page. Measure one printed photo before submitting it.',
      ],
    ],
  },
];
