'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  useStoredList,
  readList,
  writePreference,
} from '@/hooks/use-preferences';
import { ArrowUpRight, Star, Search, ArrowRight } from 'lucide-react';
import { tools, searchTools } from '@/config/tools';
import { categories } from '@/config/categories';
import type { ToolDefinition } from '@/types/tools';
import { ToolIcon } from '@/components/ui/icon';
export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const favorites = useStoredList('favorites');
  const favorite = favorites.includes(tool.slug);
  const c = categories.find((c) => c.id === tool.category)!;
  return (
    <article className="tool-card">
      <div className="tool-card-top">
        <span className={'tile-icon ' + c.color}>
          <ToolIcon name={tool.icon} />
        </span>
        <button
          className={'favorite icon-button ' + (favorite ? 'selected' : '')}
          aria-label={
            (favorite ? 'Remove from' : 'Add to') + ' favorites: ' + tool.name
          }
          onClick={() => {
            const all: string[] = readList('favorites');
            writePreference(
              'favorites',
              JSON.stringify(
                favorite
                  ? all.filter((s) => s !== tool.slug)
                  : [...new Set([...all, tool.slug])],
              ),
            );
          }}
        >
          <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <Link href={'/tools/' + tool.slug}>
        <h3>{tool.name}</h3>
        <p>{tool.shortDescription}</p>
        <span className="tool-card-link">
          Open tool <ArrowUpRight size={17} />
        </span>
      </Link>
    </article>
  );
}
export function Directory({ category }: { category?: string }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(category || 'all');
  const [sort, setSort] = useState('default');
  const saved = useStoredList('favorites');
  useEffect(() => {
    const query = new URLSearchParams(location.search).get('q');
    if (query) queueMicrotask(() => setQuery(query));
  }, []);
  let results = searchTools(query).filter(
    (t) => filter === 'all' || t.category === filter,
  );
  if (sort === 'popular') results = results.filter((t) => t.popular);
  if (sort === 'favorites')
    results = results.filter((t) => saved.includes(t.slug));
  if (sort === 'alphabetical')
    results = [...results].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <div className="directory-toolbar">
        <div className="search-field">
          <Search size={20} />
          <input
            aria-label="Search directory"
            placeholder="What would you like to do?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              const url = new URL(location.href);
              if (e.target.value) url.searchParams.set('q', e.target.value);
              else url.searchParams.delete('q');
              history.replaceState(null, '', url.pathname + url.search);
            }}
          />
        </div>
        <select
          aria-label="Sort and filter tools"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="default">All tools</option>
          <option value="popular">Popular tools</option>
          <option value="alphabetical">A–Z</option>
          <option value="favorites">My favorites</option>
        </select>
      </div>
      {!category && (
        <div className="filter-chips">
          {[{ id: 'all', name: 'All categories' }, ...categories].map((c) => (
            <button
              className={filter === c.id ? 'active' : ''}
              onClick={() => setFilter(c.id)}
              key={c.id}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <p className="result-count">
        {results.length} tools · Free to use. Yours to explore.
      </p>
      <div className="tool-grid">
        {results.map((t) => (
          <ToolCard tool={t} key={t.slug} />
        ))}
      </div>
      {!results.length && (
        <div className="empty-state">
          <Search />
          <h3>No tools found</h3>
          <p>Try another search or save a tool with the star icon.</p>
        </div>
      )}
    </>
  );
}
export function RecentTools() {
  const recent = useStoredList('recent');
  if (!recent.length) return null;
  return (
    <section className="section container">
      <div className="section-heading">
        <h2>Pick up where you left off</h2>
        <Link href="/all-tools">
          All tools <ArrowRight size={16} />
        </Link>
      </div>
      <div className="tool-grid">
        {recent.slice(0, 4).map((s) => {
          const t = tools.find((t) => t.slug === s);
          return t ? <ToolCard key={s} tool={t} /> : null;
        })}
      </div>
    </section>
  );
}
