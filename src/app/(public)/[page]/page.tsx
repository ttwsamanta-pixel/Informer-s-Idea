import { AnalyticsPreferences } from '@/components/backend/analytics-preferences';
import { catalog, pageSEO } from '@/server/content';
import ConverterHub from '@/components/tools/converter-hub';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categories } from '@/config/categories';
import { Directory } from '@/components/tools/directory';
import { FAQ } from '@/components/ui/faq';
import { ContactPage } from '@/components/layout/contact-page';
import { information } from '@/config/information';
import { contentPage } from '@/server/content';
import { cleanContent } from '@/lib/content-html';
export function generateStaticParams() {
  return [
    ...categories.map((c) => ({ page: c.slug })),
    ...Object.keys(information).map((page) => ({ page })),
    { page: 'contact' },
  ];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const { categories } = await catalog();
  const c = categories.find((c) => c.slug === page);
  const info = await contentPage(page);
  return pageSEO('/' + page, {
    alternates: { canonical: '/' + page },
    title:
      c?.name ||
      info?.title ||
      (page === 'contact' ? 'Contact' : 'Page not found'),
    description: c?.description || info?.description,
  });
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const { categories, tools } = await catalog();
  const pageContent = await contentPage(page);
  const category = categories.find((c) => c.slug === page);
  if (category?.id === 'converter')
    return (
      <>
        <ConverterHub />
        {pageContent?.content && (
          <section
            className="container prose"
            dangerouslySetInnerHTML={{ __html: pageContent.content }}
          />
        )}
      </>
    );
  if (category)
    return (
      <>
        <section className="page-intro">
          <div className="container">
            <div className="breadcrumbs">
              <Link href="/">Home</Link>
              <span>›</span>
              {category.name}
            </div>
            <span className="eyebrow">
              {tools.filter((t) => t.category === category.id).length} FREE
              TOOLS · ALL IN YOUR BROWSER
            </span>
            <h1>{pageContent?.title || category.name}</h1>
            <p>{pageContent?.description || category.description}</p>
          </div>
        </section>
        <section className="section container">
          <Directory category={category.id} />
          {pageContent?.content && (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: pageContent.content }}
            />
          )}
          <FAQ
            items={[
              {
                question: `Are these ${category.name.toLowerCase()} free?`,
                answer:
                  'Yes. Every tool listed here is free to use without an account or a subscription.',
              },
              {
                question: 'How is my privacy protected?',
                answer:
                  'File processing happens in your browser. We do not receive or store the files you choose. Only tool preferences are saved locally.',
              },
              {
                question: 'Can I use these tools on my phone?',
                answer:
                  'Yes. The workspaces adapt to mobile and tablet screens. Large PDFs or AI models may work better on a desktop with more memory.',
              },
            ]}
          />
          <h2 style={{ marginBottom: 20 }}>More ways to get things done</h2>
          <div className="related-categories">
            {categories
              .filter((c) => c.id !== category.id)
              .map((c) => (
                <Link key={c.id} href={'/' + c.slug}>
                  {c.name}
                </Link>
              ))}
          </div>
        </section>
      </>
    );
  if (page === 'contact') return <ContactPage />;
  const info = await contentPage(page);
  if (!info) notFound();
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <span className="eyebrow">INFORMER’S IDEA</span>
          <h1>{info.title}</h1>
          <p>{info.description}</p>
        </div>
      </section>
      <article className="container prose">
        <div dangerouslySetInnerHTML={{ __html: cleanContent(info.content) }} />
        {page === 'privacy-policy' && <AnalyticsPreferences />}
        {page === 'about' && (
          <Link className="button primary" href="/all-tools">
            Explore the toolkit →
          </Link>
        )}
      </article>
    </>
  );
}
