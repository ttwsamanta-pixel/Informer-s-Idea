import Link from 'next/link';
import {
  Image,
  FileText,
  Music2,
  Video,
  Archive,
  ArrowRight,
} from 'lucide-react';

const pair = (from: string, to: string) => ({
  name: `${from.toUpperCase()} to ${to.toUpperCase()}`,
  href: `/converter-tools?from=${from}&to=${to}`,
});
const category = (name: string, value: string) => ({
  name,
  href: `/converter-tools?category=${encodeURIComponent(value)}`,
});
const groups = [
  {
    title: 'Image',
    icon: Image,
    links: [
      category('Image Converter', 'Images'),
      pair('jpg', 'png'),
      pair('png', 'jpg'),
      pair('webp', 'jpg'),
      pair('webp', 'png'),
      pair('jpg', 'webp'),
      pair('png', 'webp'),
      pair('gif', 'png'),
      pair('bmp', 'jpg'),
      pair('jpg', 'pdf'),
    ],
  },
  {
    title: 'Document',
    icon: FileText,
    links: [
      category('Document Converter', 'Documents'),
      pair('pdf', 'jpg'),
      pair('pdf', 'png'),
      pair('pdf', 'txt'),
      pair('txt', 'html'),
      pair('html', 'txt'),
      pair('md', 'txt'),
    ],
  },
  {
    title: 'Audio',
    icon: Music2,
    links: [
      category('Audio Converter', 'Audio'),
      pair('mp3', 'wav'),
      pair('m4a', 'wav'),
      pair('ogg', 'wav'),
      pair('flac', 'wav'),
      pair('weba', 'wav'),
    ],
  },
  {
    title: 'Video',
    icon: Video,
    links: [category('Video availability', 'Video')],
    unavailable: ['MP4 to MP3', 'MP4 to WAV', 'MOV to MP4', 'MP4 to GIF'],
  },
  {
    title: 'Other',
    icon: Archive,
    links: [
      category('Spreadsheet Converter', 'Spreadsheets'),
      pair('csv', 'json'),
      pair('json', 'csv'),
      pair('csv', 'tsv'),
      pair('tsv', 'csv'),
      pair('txt', 'gz'),
      pair('gz', 'txt'),
    ],
  },
];

export function ConverterMenu({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={
        mobile
          ? 'converter-menu-columns converter-menu-mobile'
          : 'container converter-menu-columns'
      }
    >
      {groups.map(({ title, icon: Icon, links, unavailable }) => (
        <section className="mega-group" key={title}>
          <h2 className="purple">
            <Icon size={19} />
            {title}
          </h2>
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} prefetch={false}>
                  <span>{link.name}</span>
                  <ArrowRight size={13} />
                </Link>
              </li>
            ))}
          </ul>
          {unavailable && (
            <>
              <p className="converter-menu-note">Not available yet</p>
              <ul>
                {unavailable.map((name) => (
                  <li key={name}>
                    <span
                      className="converter-menu-unavailable"
                      aria-disabled="true"
                    >
                      {name}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
