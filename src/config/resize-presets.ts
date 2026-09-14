// Starting dimensions supplied in the design reference, not official compliance claims.
export const resizePresets = [
  {
    id: 'passport',
    name: 'Passport',
    width: 413,
    height: 531,
    icon: 'passport',
  },
  { id: 'pan', name: 'PAN Card', width: 295, height: 413, icon: 'pdf' },
  { id: 'voter', name: 'Voter ID', width: 413, height: 531, icon: 'passport' },
  { id: 'dl', name: 'DL', width: 413, height: 413, icon: 'passport' },
  { id: 'whatsapp', name: 'WhatsApp', width: 800, height: 800, icon: 'image' },
  {
    id: 'instagram',
    name: 'Instagram',
    width: 1080,
    height: 1080,
    icon: 'image',
  },
] as const;
