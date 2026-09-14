import type { Metadata } from 'next';
import { Header } from '@/components/navigation/header';
import { Footer } from '@/components/layout/footer';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  alternates: { canonical: '/' },
  title: {
    default: "Informer's Idea — Smart Tools for a Smarter You",
    template: "%s | Informer's Idea",
  },
  description:
    'Free online image, PDF, passport, OCR and QR tools. Process files privately in your browser. No uploads. No registration.',
  icons: { icon: '/logo/icon.svg' },
  openGraph: {
    title: "Informer's Idea",
    description: 'All your online tools in one place.',
    type: 'website',
  },
  twitter: { card: 'summary' },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
