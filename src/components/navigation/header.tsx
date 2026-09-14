'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readPreference, writePreference } from '@/hooks/use-preferences';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { HeaderNavigation } from './header-navigation';

import { searchTools, tools } from '@/config/tools';
import { ToolIcon } from '@/components/ui/icon';
export function Header() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
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
      <HeaderNavigation
        dark={dark}
        onTheme={toggle}
        onSearch={() => dialog.current?.showModal()}
      />
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
