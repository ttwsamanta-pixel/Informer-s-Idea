import Link from 'next/link';
import {
  ArrowRight,
  Search,
  Zap,
  ShieldCheck,
  Rocket,
  Monitor,
  Check,
  Image as ImageIcon,
  FileText,
  QrCode,
  Scan,
  Calculator,
  ArrowUpRight,
  Sparkles,
  Clock,
} from 'lucide-react';
import { categories } from '@/config/categories';
import { tools } from '@/config/tools';
import { ToolIcon } from '@/components/ui/icon';
import { ToolCard, RecentTools } from '@/components/tools/directory';
import { articles } from '@/config/articles';
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-badge">
              <span />
              100% Free <b>·</b> Fast <b>·</b> Secure <b>·</b> No Registration
            </span>
            <h1>
              All Your Online Tools
              <br />
              in <em>One Place.</em>
            </h1>
            <p>
              Edit images, work with PDFs, create passport photos,
              <br className="desktop-break" /> and more — directly in your
              browser.
              <br />
              <span>No uploads. No hassle. Just get things done.</span>
            </p>
            <form action="/all-tools" className="hero-search">
              <Search size={21} />
              <input
                name="q"
                aria-label="Search tools"
                placeholder="Search tools… (e.g. compress image, PDF to JPG)"
              />
              <button className="button primary" type="submit">
                <span>Search</span>
                <ArrowRight size={18} />
              </button>
            </form>
            <div className="popular-chips">
              <span>Popular:</span>
              {[
                'compress-image',
                'resize-image',
                'pdf-to-jpg',
                'merge-pdf',
              ].map((s) => (
                <Link key={s} href={'/tools/' + s}>
                  {tools.find((t) => t.slug === s)!.name}
                </Link>
              ))}
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Image, PDF and QR tools working privately in your browser"
          >
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="browser-art">
              <div className="browser-bar">
                <i />
                <i />
                <i />
                <span>your everyday toolkit</span>
              </div>
              <div className="browser-tiles">
                {[
                  ['green', Scan],
                  ['orange', Sparkles],
                  ['blue', Monitor],
                  ['purple', FileText],
                  ['purple', QrCode],
                  ['orange', Calculator],
                ].map(([c, Icon], i) => {
                  const I = Icon as typeof Scan;
                  return (
                    <span key={i} className={'art-tile ' + c}>
                      <I size={30} />
                    </span>
                  );
                })}
              </div>
            </div>
            <span className="floating-file image-file">
              <ImageIcon size={56} strokeWidth={1.5} />
              <small>IMG</small>
            </span>
            <span className="floating-file pdf-file">
              <FileText size={49} strokeWidth={1.5} />
              <small>PDF</small>
            </span>
            <span className="floating-file calculator-file">
              <Calculator size={44} strokeWidth={1.5} />
            </span>
            <div className="privacy-float">
              {['No file uploads', 'Works instantly', '100% private'].map(
                (t) => (
                  <span key={t}>
                    <Check size={13} />
                    {t}
                  </span>
                ),
              )}
            </div>
            <div className="art-caption">
              A little toolkit.
              <br />
              <strong>A world of possibilities.</strong>
              <svg width="136" height="16" viewBox="0 0 136 16">
                <path
                  d="M3 12Q65 0 131 5M36 15Q93 5 135 9"
                  fill="none"
                  stroke="#ffb02e"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="art-spark spark-one">✦</span>
            <span className="art-spark spark-two">✧</span>
          </div>
        </div>
      </section>
      <section className="benefits container">
        {[
          [Zap, 'Completely Free', 'No hidden charges', 'orange'],
          [
            ShieldCheck,
            'Your Privacy Matters',
            'Files stay on your device',
            'green',
          ],
          [Rocket, 'Super Fast', 'Less waiting. More doing.', 'pink'],
          [Monitor, 'Works on All Devices', 'Desktop, tablet, mobile', 'blue'],
        ].map(([Icon, title, desc, color]) => {
          const I = Icon as typeof Zap;
          return (
            <div key={title as string}>
              <span className={'benefit-icon ' + color}>
                <I size={25} />
              </span>
              <span>
                <strong>{title as string}</strong>
                <small>{desc as string}</small>
              </span>
            </div>
          );
        })}
      </section>
      <section className="section container categories-section">
        <div className="center-heading">
          <span className="eyebrow">A TOOL FOR EVERY TASK</span>
          <h2>What would you like to do today?</h2>
          <p>Find your shortcut to a more productive day.</p>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <Link href={'/' + c.slug} className="category-card" key={c.id}>
              <span className={'tile-icon ' + c.color}>
                <ToolIcon name={c.icon} size={27} />
              </span>
              <div>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
              </div>
              <span className="count-badge">
                {tools.filter((t) => t.category === c.id).length}{' '}
                {tools.filter((t) => t.category === c.id).length === 1
                  ? 'Tool'
                  : 'Tools'}
              </span>
              <ArrowRight size={17} className="category-arrow" />
            </Link>
          ))}
        </div>
      </section>
      <section className="container">
        <div className="cta-banner">
          <div>
            <span className="cta-eyebrow">
              LESS EFFORT. MORE POSSIBILITIES.
            </span>
            <h2>
              Make Your Work Easier
              <br />
              With Informer’s Idea
            </h2>
            <p>Your everyday tasks, a whole lot simpler.</p>
            <Link href="/all-tools" className="button white">
              Explore All Tools <ArrowRight size={18} />
            </Link>
          </div>
          <div className="cta-art" aria-hidden="true">
            <span>
              <ImageIcon size={53} />
            </span>
            <span>
              <FileText size={48} />
            </span>
            <span>
              <QrCode size={46} />
            </span>
            <p>
              Simple.
              <br />
              Powerful.
              <br />
              Free forever.
            </p>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE EVERYDAY FAVORITES</span>
            <h2>Small tools. Big time-savers.</h2>
            <p>Our most-loved tools, ready when you are.</p>
          </div>
          <Link className="text-link" href="/all-tools">
            Browse all tools <ArrowRight size={17} />
          </Link>
        </div>
        <div className="tool-grid">
          {tools
            .filter((t) => t.popular)
            .map((t) => (
              <ToolCard tool={t} key={t.slug} />
            ))}
        </div>
      </section>
      <RecentTools />
      <section className="blog-section">
        <div className="section container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LEARN SOMETHING USEFUL</span>
              <h2>A little know-how goes a long way.</h2>
              <p>Simple guides to help you get more out of your tools.</p>
            </div>
            <Link href="/blog" className="button secondary">
              View all posts <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="blog-grid">
            {articles.map((a, i) => (
              <Link href={'/blog/' + a.slug} className="blog-card" key={a.slug}>
                <div className={'blog-cover cover-' + i}>
                  <span>{a.category}</span>
                  {i === 0 ? (
                    <>
                      <ImageIcon size={72} />
                      <ArrowRight size={25} />
                      <ImageIcon size={49} />
                    </>
                  ) : i === 1 ? (
                    <>
                      <FileText size={61} />
                      <span className="cover-plus">+</span>
                      <FileText size={61} />
                      <ArrowRight size={24} />
                      <FileText size={70} />
                    </>
                  ) : (
                    <>
                      <Scan size={62} />
                      <div className="portrait-placeholder">
                        ID
                        <br />
                        <small>35 × 45 mm</small>
                      </div>
                    </>
                  )}
                </div>
                <div className="blog-copy">
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                  <span>
                    <Clock size={13} />
                    {a.minutes} min read <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="bottom-trust container">
        <ShieldCheck size={26} />
        <div>
          <strong>Your files. Your device. Your peace of mind.</strong>
          <p>
            All file processing happens in your browser. We never receive or
            store your files.
          </p>
        </div>
      </section>
    </>
  );
}
