import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Logo } from './logo';
import { categories } from '@/config/categories';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            Small tasks. Big possibilities.
            <br />
            Free tools that make your digital life simpler, faster, and a little
            smarter.
          </p>
          <span className="footer-privacy">
            <ShieldCheck size={16} /> Your files stay yours.
          </span>
        </div>
        <div>
          <h3>Quick links</h3>
          {[
            ['Home', '/'],
            ['All Tools', '/all-tools'],
            ['Blog', '/blog'],
            ['About us', '/about'],
            ['Contact', '/contact'],
          ].map(([n, u]) => (
            <Link href={u} key={u}>
              {n}
            </Link>
          ))}
        </div>
        <div>
          <h3>Explore tools</h3>
          {categories
            .filter((c) => c.id !== 'ai')
            .map((c) => (
              <Link key={c.id} href={'/' + c.slug}>
                {c.name}
              </Link>
            ))}
        </div>
        <div>
          <h3>The important stuff</h3>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms-of-use">Terms of Use</Link>
          <Link href="/disclaimer">Disclaimer</Link>
          <a
            href="https://github.com/ttwsamanta-pixel/Informer-s-Idea"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code
          </a>
          <Link href="/sitemap.xml">
            Sitemap <ArrowUpRight size={12} />
          </Link>
          <p className="footer-note">
            Files are processed locally in your browser and are not stored on
            our servers.
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} Informer’s Idea. All rights reserved.
        </span>
        <span>
          Made with <span className="heart">♥</span> for a smarter web.
        </span>
      </div>
    </footer>
  );
}
