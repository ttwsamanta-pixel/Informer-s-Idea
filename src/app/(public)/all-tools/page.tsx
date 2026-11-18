import { pageSEO, contentPage } from '@/server/content';
import { Directory } from '@/components/tools/directory';
import { catalog } from '@/server/content';
export async function generateMetadata() {
  return pageSEO('/all-tools', {
    alternates: { canonical: '/all-tools' },
    title: 'All Free Online Tools',
    description:
      'Browse free image, PDF, OCR, QR, passport and everyday tools. Search by task and process your files locally.',
  });
}
export default async function AllTools() {
  const { tools } = await catalog();
  const page = await contentPage('all-tools');
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <span className="eyebrow">YOUR EVERYDAY TOOLKIT</span>
          <h1>{page?.title || 'A shortcut for every task.'}</h1>
          <p>
            {page?.description ||
              `${tools.length} free tools and useful variants. Find what you need, make it happen, and get on with your day.`}
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
        <Directory />
      </section>
    </>
  );
}
