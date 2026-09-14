import Link from 'next/link';
import { articles } from '@/config/articles';
export const metadata = {
  alternates: { canonical: '/blog' },
  title: 'Tips & Guides',
  description:
    'Practical guides to image compression, PDF merging, and passport photo dimensions.',
};
export default function Blog() {
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <span className="eyebrow">A LITTLE KNOW-HOW</span>
          <h1>Make the most of your tools.</h1>
          <p>Clear, practical guides. No complicated jargon.</p>
        </div>
      </section>
      <section className="section container">
        <div className="blog-grid">
          {articles.map((a) => (
            <Link href={'/blog/' + a.slug} className="tool-card" key={a.slug}>
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
