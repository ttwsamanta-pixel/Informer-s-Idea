import Link from 'next/link';
import { notFound } from 'next/navigation';
import { articles } from '@/config/articles';
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  return {
    alternates: { canonical: '/blog/' + slug },
    title: a?.title,
    description: a?.description,
  };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  if (!a) notFound();
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <div className="breadcrumbs">
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href="/blog">Guides</Link>
          </div>
          <span className="eyebrow">
            {a.category} · {a.minutes} MIN READ
          </span>
          <h1>{a.title}</h1>
          <p>{a.description}</p>
        </div>
      </section>
      <article className="container prose">
        {a.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <Link className="button primary" href={'/tools/' + a.tool}>
          Try the tool →
        </Link>
      </article>
    </>
  );
}
