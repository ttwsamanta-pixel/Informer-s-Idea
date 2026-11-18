import { AnalyticsPreferences } from '@/components/backend/analytics-preferences';
import { catalog, pageSEO } from '@/server/content';
import ConverterHub from '@/components/tools/converter-hub';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categories } from '@/config/categories';
import { Directory } from '@/components/tools/directory';
import { FAQ } from '@/components/ui/faq';
import { ContactForm } from '@/components/layout/contact';
const information: Record<
  string,
  { title: string; description: string; sections: [string, string][] }
> = {
  about: {
    title: 'Small tools. A smarter everyday.',
    description:
      'Meet Informer’s Idea — your friendly corner of the internet for getting things done.',
    sections: [
      [
        'Our idea is simple',
        'Useful tools should be easy to find, easy to use, and free. Informer’s Idea brings everyday image, PDF, QR, text and document tasks together in one place.',
      ],
      [
        'Privacy is part of the design',
        'Your files are processed in your browser. Tool files are not uploaded or stored by us. Administration uses a separate account database; the free browser tools do not require an account.',
      ],
      [
        'Built for your real day',
        'Resize a photo for a form. Combine a set of PDFs. Extract text from a screenshot. Make a QR code for your WiFi. Choose a tool, get your result, and move on.',
      ],
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    description:
      'Your files belong to you. Here is how this website handles data.',
    sections: [
      [
        'File processing',
        'All supported file processing takes place locally in your browser. The application does not upload your files or store them on a server. Closing the page clears in-memory file references. Downloads are saved where your browser normally saves files.',
      ],
      [
        'Local preferences',
        'We use localStorage for your theme choice, favorite tool IDs, and recently used tool IDs. We do not store file contents in localStorage. You can remove preferences by clearing site data in your browser.',
      ],
      [
        'External engine downloads',
        'OCR loads language data and its runtime from the Tesseract distribution infrastructure. Background removal downloads its runtime and model from IMG.LY. These providers receive normal asset requests, including your IP address, but do not receive the files you process.',
      ],
      [
        'Hosting and links',
        'Your hosting provider may retain ordinary access logs. We no longer send visitor analytics events to our built-in MySQL collector. Previously collected detailed events follow the configured retention period. Administrators have secured account and audit records. Active ad placements may load third-party resources. External links have their own policies.',
      ],
      [
        'Google Analytics',
        'When analytics is enabled by the site, Google Analytics 4 loads automatically on the public website unless you have opted out or your browser sends a privacy signal. Google receives usage information such as page URLs, referrers, browser/device information and enabled automatic interactions, and uses cookies to distinguish visits. Enabled site-search tracking may collect search terms from URLs; do not enter personal information into tool searches. Our custom tool events send only the tool identifier, never uploaded files, document contents or processing inputs. Advertising personalization and Google signals are disabled. Google handles this data under its privacy policy at https://policies.google.com/privacy. Use the control below to disable Google Analytics for this browser and remove its cookies. Previous analytics opt-outs remain respected. Browser Do Not Track and Global Privacy Control signals also prevent loading. Google Analytics retention is configured separately in the Google Analytics account.',
      ],
    ],
  },
  'terms-of-use': {
    title: 'Terms of Use',
    description: 'A few straightforward terms for using Informer’s Idea.',
    sections: [
      [
        'Using the tools',
        'Use the tools only with content you are authorized to process. You retain ownership of your files. You are responsible for checking the suitability and accuracy of generated results before relying on them.',
      ],
      [
        'Availability and limitations',
        'Tools are provided as available, without a guarantee that every file or browser is supported. Keep original copies of important files. Device memory, browser capabilities, file structure, and network access for initial engine downloads can affect operation.',
      ],
      [
        'No official certification',
        'Passport and ID tools prepare dimensions and print layouts only. They do not verify identity, official compliance, or acceptance by an issuing authority. OCR results can contain mistakes.',
      ],
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    description: 'Know what your tools can — and cannot — do.',
    sections: [
      [
        'Review your results',
        'Check processed documents, images, and recognized text before submitting, publishing, or printing. These tools do not replace specialist software or official application guidance.',
      ],
      [
        'Browser-only limits',
        'Encrypted PDFs, strong PDF compression, document redaction, object removal, and unsupported image formats are not offered in this phase. Metadata clearing is limited to the explicitly described fields and does not guarantee complete removal of sensitive information.',
      ],
      [
        'Independent project',
        'Informer’s Idea is an independent tools platform and is not affiliated with passport authorities or other tools websites.',
      ],
    ],
  },
};
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
  const info = information[page];
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
  const category = categories.find((c) => c.slug === page);
  if (category?.id === 'converter') return <ConverterHub />;
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
            <h1>{category.name}</h1>
            <p>
              {category.description} No uploads, no accounts, no unnecessary
              steps.
            </p>
          </div>
        </section>
        <section className="section container">
          <Directory category={category.id} />
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
  if (page === 'contact')
    return (
      <>
        <section className="page-intro">
          <div className="container">
            <span className="eyebrow">LET’S MAKE THIS BETTER</span>
            <h1>Have an idea? We’re listening.</h1>
            <p>
              Report an issue or suggest a tool through the project’s GitHub
              repository.
            </p>
          </div>
        </section>
        <section className="container prose">
          <ContactForm />
        </section>
      </>
    );
  const info = information[page];
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
        {info.sections.map(([h, p]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </section>
        ))}
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
