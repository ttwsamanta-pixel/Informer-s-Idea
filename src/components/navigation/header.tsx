'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readPreference, writePreference } from '@/hooks/use-preferences';
import {
  Search,
  Moon,
  Sun,
  Menu,
  X,
  Grid2X2,
  ChevronDown,
  ArrowUpRight,
} from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { categories } from '@/config/categories';
import { searchTools, tools } from '@/config/tools';
import { ToolIcon } from '@/components/ui/icon';
export function Header() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const saved = readPreference('theme');
    const isDark =
      saved === 'dark' ||
      (!saved && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'; // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(isDark);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dialog.current?.showModal();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  const toggle = () => {
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    writePreference('theme', dark ? 'light' : 'dark');
    setDark(!dark);
  };
  const results = (
    query ? searchTools(query) : tools.filter((t) => t.popular)
  ).slice(0, 12);
  return (
    <>
      <header className="site-header">
        <div className="container nav-row">
          <Logo />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/">Home</Link>
            {['image', 'pdf'].map((id) => (
              <details className="nav-dropdown" key={id}>
                <summary>
                  {id === 'image' ? 'Image' : 'PDF'} Tools{' '}
                  <ChevronDown size={13} />
                </summary>
                <div className="dropdown-panel">
                  {tools
                    .filter((t) => t.category === id)
                    .slice(0, 6)
                    .map((t) => (
                      <Link href={'/tools/' + t.slug} key={t.slug}>
                        {t.name}
                      </Link>
                    ))}
                  <Link href={'/' + id + '-tools'}>
                    Explore all {id} tools <ArrowUpRight size={14} />
                  </Link>
                </div>
              </details>
            ))}
            <details className="nav-dropdown">
              <summary>
                More Tools <ChevronDown size={13} />
              </summary>
              <div className="dropdown-panel">
                {categories
                  .filter((c) => !['image', 'pdf'].includes(c.id))
                  .map((c) => (
                    <Link href={'/' + c.slug} key={c.id}>
                      {c.name}
                    </Link>
                  ))}
              </div>
            </details>
            <Link href="/passport-tools">Passport</Link>
            <Link href="/ocr-tools">OCR</Link>
            <Link href="/qr-tools">QR</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="nav-actions">
            <button
              className="icon-button"
              aria-label="Search tools"
              onClick={() => dialog.current?.showModal()}
            >
              <Search size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={toggle}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link href="/all-tools" className="button primary nav-cta">
              <Grid2X2 size={16} />
              All Tools
            </Link>
            <button
              className="icon-button menu-toggle"
              aria-label={menu ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <button className="button secondary full-width" onClick={toggle}>
              {dark ? 'Switch to light theme' : 'Switch to dark theme'}
            </button>
            {[
              { slug: '', name: 'Home' },
              ...categories,
              { slug: 'all-tools', name: 'All Tools' },
              { slug: 'blog', name: 'Blog' },
              { slug: 'about', name: 'About' },
              { slug: 'contact', name: 'Contact' },
            ].map((c) => (
              <Link
                key={c.slug}
                href={'/' + c.slug}
                onClick={() => setMenu(false)}
              >
                {c.name}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </nav>
        )}
      </header>
      <dialog
        ref={dialog}
        className="search-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="dialog-heading">
          <h2>Find your next shortcut</h2>
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <div className="search-field">
          <Search size={20} />
          <input
            autoFocus
            aria-label="Search all tools"
            placeholder="Search tools, formats, or tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                dialog.current?.close();
                router.push('/tools/' + results[0].slug);
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="search-results">
          {results.map((t) => (
            <Link
              href={'/tools/' + t.slug}
              key={t.slug}
              onClick={() => dialog.current?.close()}
            >
              <ToolIcon name={t.icon} />
              <span>
                <strong>{t.name}</strong>
                <small>{t.shortDescription}</small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          ))}
          {!results.length && (
            <p>No tools found. Try “image”, “PDF”, or “QR”.</p>
          )}
        </div>
      </dialog>
    </>
  );
}
