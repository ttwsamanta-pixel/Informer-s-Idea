export const information: Record<
  string,
  { title: string; description: string; sections: [string, string][] }
> = {
  about: {
    title: 'Small tools. A smarter everyday.',
    description:
      'Meet Informer’s Idea — your friendly corner of the internet for getting things done.',
    sections: [
      [
        'Our idea is simple',
        'Useful tools should be easy to find, easy to use, and free. Informer’s Idea brings everyday image, PDF, QR, text and document tasks together in one place.',
      ],
      [
        'Privacy is part of the design',
        'Your files are processed in your browser. Tool files are not uploaded or stored by us. Administration uses a separate account database; the free browser tools do not require an account.',
      ],
      [
        'Built for your real day',
        'Resize a photo for a form. Combine a set of PDFs. Extract text from a screenshot. Make a QR code for your WiFi. Choose a tool, get your result, and move on.',
      ],
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    description:
      'Your files belong to you. Here is how this website handles data.',
    sections: [
      [
        'File processing',
        'All supported file processing takes place locally in your browser. The application does not upload your files or store them on a server. Closing the page clears in-memory file references. Downloads are saved where your browser normally saves files.',
      ],
      [
        'Local preferences',
        'We use localStorage for your theme choice, favorite tool IDs, and recently used tool IDs. We do not store file contents in localStorage. You can remove preferences by clearing site data in your browser.',
      ],
      [
        'External engine downloads',
        'OCR loads language data and its runtime from the Tesseract distribution infrastructure. Background removal downloads its runtime and model from IMG.LY. These providers receive normal asset requests, including your IP address, but do not receive the files you process.',
      ],
      [
        'Hosting and links',
        'Your hosting provider may retain ordinary access logs. We no longer send visitor analytics events to our built-in MySQL collector. Previously collected detailed events follow the configured retention period. Administrators have secured account and audit records. Active ad placements may load third-party resources. External links have their own policies.',
      ],
      [
        'Google Analytics',
        'When analytics is enabled by the site, Google Analytics 4 loads automatically on the public website unless you have opted out or your browser sends a privacy signal. Google receives usage information such as page URLs, referrers, browser/device information and enabled automatic interactions, and uses cookies to distinguish visits. Enabled site-search tracking may collect search terms from URLs; do not enter personal information into tool searches. Our custom tool events send only the tool identifier, never uploaded files, document contents or processing inputs. Advertising personalization and Google signals are disabled. Google handles this data under its privacy policy at https://policies.google.com/privacy. Use the control below to disable Google Analytics for this browser and remove its cookies. Previous analytics opt-outs remain respected. Browser Do Not Track and Global Privacy Control signals also prevent loading. Google Analytics retention is configured separately in the Google Analytics account.',
      ],
    ],
  },
  'terms-of-use': {
    title: 'Terms of Use',
    description: 'A few straightforward terms for using Informer’s Idea.',
    sections: [
      [
        'Using the tools',
        'Use the tools only with content you are authorized to process. You retain ownership of your files. You are responsible for checking the suitability and accuracy of generated results before relying on them.',
      ],
      [
        'Availability and limitations',
        'Tools are provided as available, without a guarantee that every file or browser is supported. Keep original copies of important files. Device memory, browser capabilities, file structure, and network access for initial engine downloads can affect operation.',
      ],
      [
        'No official certification',
        'Passport and ID tools prepare dimensions and print layouts only. They do not verify identity, official compliance, or acceptance by an issuing authority. OCR results can contain mistakes.',
      ],
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    description: 'Know what your tools can — and cannot — do.',
    sections: [
      [
        'Review your results',
        'Check processed documents, images, and recognized text before submitting, publishing, or printing. These tools do not replace specialist software or official application guidance.',
      ],
      [
        'Browser-only limits',
        'Encrypted PDFs, strong PDF compression, document redaction, object removal, and unsupported image formats are not offered in this phase. Metadata clearing is limited to the explicitly described fields and does not guarantee complete removal of sensitive information.',
      ],
      [
        'Independent project',
        'Informer’s Idea is an independent tools platform and is not affiliated with passport authorities or other tools websites.',
      ],
    ],
  },
};
