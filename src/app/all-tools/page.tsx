import { Directory } from '@/components/tools/directory';
import { tools } from '@/config/tools';
export const metadata = {
  alternates: { canonical: '/all-tools' },
  title: 'All Free Online Tools',
  description:
    'Browse free image, PDF, OCR, QR, passport and everyday tools. Search by task and process your files locally.',
};
export default function AllTools() {
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <span className="eyebrow">YOUR EVERYDAY TOOLKIT</span>
          <h1>A shortcut for every task.</h1>
          <p>
            {tools.length} free tools and useful variants. Find what you need,
            make it happen, and get on with your day.
          </p>
        </div>
      </section>
      <section className="section container">
        <Directory />
      </section>
    </>
  );
}
