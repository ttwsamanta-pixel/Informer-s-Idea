import { pageSEO, contentPage } from '@/server/content';
import Link from 'next/link';
import { blog } from '@/server/content';
export async function generateMetadata() {
  return pageSEO('/blog', {
    alternates: { canonical: '/blog' },
    title: 'Tips & Guides',
    description:
      'Practical guides to image compression, PDF merging, and passport photo dimensions.',
  });
}
export default async function Blog() {
  const articles = await blog();
  const page = await contentPage('blog');
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <span className="eyebrow">A LITTLE KNOW-HOW</span>
          <h1>{page?.title || 'Make the most of your tools.'}</h1>
          <p>
            {page?.description ||
              'Clear, practical guides. No complicated jargon.'}
          </p>
        </div>
      </section>
      <section className="section container">
        {page?.content && (
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}
        <div className="blog-grid">
          {articles.map((a) => (
            <Link href={'/blog/' + a.slug} className="tool-card" key={a.slug}>
              {a.featuredImage && (
                <img
                  className="blog-featured-thumbnail"
                  src={a.featuredImage}
                  alt={a.title}
                />
              )}
              <span className="eyebrow">{a.category}</span>
              <h2 style={{ fontSize: 22 }}>{a.title}</h2>
              <p>{a.description}</p>
              <span className="tool-card-link">
                {a.minutes} min read <span>Read guide →</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
