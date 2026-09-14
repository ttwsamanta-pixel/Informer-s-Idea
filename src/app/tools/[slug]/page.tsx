import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { tools, findTool } from '@/config/tools';
import { categories } from '@/config/categories';
import { ToolStructuredData } from '@/components/tools/structured-data';
import { ToolWorkspace } from '@/components/tools/tool-workspace';
import { ToolCard } from '@/components/tools/directory';
import { FAQ } from '@/components/ui/faq';
export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const t = findTool((await params).slug);
  return t
    ? {
        alternates: { canonical: '/tools/' + t.slug },
        title: { absolute: t.seoTitle },
        description: t.seoDescription,
        openGraph: { title: t.seoTitle, description: t.seoDescription },
        twitter: {
          card: 'summary',
          title: t.seoTitle,
          description: t.seoDescription,
        },
      }
    : {};
}
export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = findTool((await params).slug);
  if (!t) notFound();
  const c = categories.find((c) => c.id === t.category)!;
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <div className="breadcrumbs">
            <Link href="/">Home</Link>
            <ChevronRight size={12} />
            <Link href={'/' + c.slug}>{c.name}</Link>
            <ChevronRight size={12} />
            <span>{t.name}</span>
          </div>
          <span className="eyebrow">
            {c.name.toUpperCase()} · RUNS IN YOUR BROWSER
          </span>
          <h1>{t.name}</h1>
          <p>{t.longDescription}</p>
        </div>
      </section>
      <section className="section container">
        <ToolStructuredData
          tool={t}
          categoryName={c.name}
          categorySlug={c.slug}
        />
        <ToolWorkspace tool={t} />
        <FAQ
          items={[
            {
              question: `How do I use ${t.name}?`,
              answer: ['qr', 'utility'].includes(t.processor)
                ? 'Enter your information, adjust the available options, then use the main action. Copy or download your result.'
                : 'Choose a supported file, adjust the available settings, and run the tool. Preview or download the result. Your original file is never modified.',
            },
            {
              question: 'Are my files uploaded anywhere?',
              answer:
                'No. File processing runs in your browser. OCR and AI tools download their engine or model on first use, but your files are not sent to those services.',
            },
            {
              question:
                t.processor === 'image'
                  ? 'Which image formats can I use?'
                  : 'Are there any limits?',
              answer:
                t.processor === 'image'
                  ? 'JPG, PNG and WebP are supported. Each file may be up to 40 MB. You can process up to 20 files with a combined maximum of 100 MB. PNG is lossless and may not become smaller.'
                  : 'File tools accept up to 40 MB per file, with a combined 100 MB limit. Large documents and AI models also depend on your device’s memory. Try smaller batches if processing fails.',
            },
          ]}
        />
        <div className="section-heading">
          <h2>Keep your workflow going</h2>
          <Link href={'/' + c.slug}>More {c.name.toLowerCase()}</Link>
        </div>
        <div className="tool-grid">
          {t.relatedTools
            .map((s) => findTool(s))
            .filter((t) => !!t)
            .map((t) => (
              <ToolCard tool={t} key={t.slug} />
            ))}
        </div>
      </section>
    </>
  );
}
