import { BrandingProvider } from '@/components/backend/branding-context';
import { Header } from '@/components/navigation/header';
import { Footer } from '@/components/layout/footer';
import { PublicServices } from '@/components/backend/public-services';
import { CatalogProvider } from '@/components/backend/catalog-context';
import { catalog, settings } from '@/server/content';
import { AdSlot } from '@/components/ui/ads';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const config = await settings();
  const title = String(config.siteTitle || "Informer's Idea");
  return {
    title: { default: title, template: `%s | ${title}` },
    ...(config.description ? { description: String(config.description) } : {}),
    ...(config.favicon ? { icons: { icon: String(config.favicon) } } : {}),
    robots: { index: config.allowIndexing !== false, follow: true },
    ...(config.ogImage
      ? { openGraph: { title, images: [String(config.ogImage)] } }
      : {}),
  };
}
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await catalog();
  const config = await settings();
  const branding = {
    siteTitle: String(config.siteTitle || ''),
    logo: String(config.logo || ''),
    tagline: String(config.tagline || ''),
    youtube: String(config.youtube || ''),
    youtubeBangla: String(config.youtubeBangla || ''),
  };
  return (
    <BrandingProvider value={branding}>
      <CatalogProvider value={data}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <AdSlot placement="header" />
        <PublicServices />
        <main id="main">{children}</main>
        <AdSlot placement="footer" />
        <Footer />
      </CatalogProvider>
    </BrandingProvider>
  );
}
