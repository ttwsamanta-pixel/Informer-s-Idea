import { information } from '@/config/information';
import { cleanContent, textContent } from '@/lib/content-html';
import 'server-only';
import { cache } from 'react';
import { query, databaseConfigured } from './db';
import { tools as builtInTools } from '@/config/tools';
import { categories as builtInCategories } from '@/config/categories';
import { articles as builtInArticles } from '@/config/articles';
import type { ToolDefinition } from '@/types/tools';
import type { Metadata } from 'next';
export interface RecordRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  data: Record<string, unknown> | string;
  updated_at?: string;
}
export function unpack(row: RecordRow) {
  return {
    ...(typeof row.data === 'string' ? JSON.parse(row.data) : row.data),
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    updatedAt: row.updated_at,
  } as Record<string, unknown>;
}
export async function records(table: string) {
  return (
    await query<RecordRow>(`SELECT * FROM ${table} ORDER BY created_at DESC`)
  ).map(unpack);
}
export const settings = cache(async function settings() {
  if (!databaseConfigured())
    return {
      analyticsEnabled: false,
      allowIndexing: true,
      retentionDays: 90,
    } as Record<string, unknown>;
  const [s] = await query<{ data: Record<string, unknown> | string }>(
    "SELECT data FROM ssinfo_site_settings WHERE id='general'",
  );
  return (
    typeof s?.data === 'string' ? JSON.parse(s.data) : s?.data || {}
  ) as Record<string, unknown>;
});
export const catalog = cache(async function catalog() {
  if (!databaseConfigured())
    return { tools: builtInTools, categories: [...builtInCategories] };
  const categoryRows = (await records('ssinfo_tool_categories'))
    .filter((c) => c.status === 'active')
    .sort(
      (a, b) =>
        Number(
          a.sortOrder ?? builtInCategories.findIndex((c) => c.id === a.id),
        ) -
        Number(
          b.sortOrder ?? builtInCategories.findIndex((c) => c.id === b.id),
        ),
    );
  const categories = categoryRows.map((c) => ({
    ...c,
    description: String(c.description || ''),
    icon: String(c.icon || 'utility'),
    color: String(c.color || 'purple'),
  })) as unknown as (typeof builtInCategories)[number][];
  const tools = (await records('ssinfo_tools'))
    .filter(
      (t) =>
        t.status === 'active' && categories.some((c) => c.id === t.category),
    )
    .flatMap((t) => {
      const processor = builtInTools.find(
        (b) => b.id === (t.processorId || t.id),
      );
      if (!processor) return [];
      return [
        {
          ...processor,
          ...t,
          keywords: String(t.keywords || '')
            .split(',')
            .map((s) => s.trim()),
          browserOnly: true,
        } as ToolDefinition,
      ];
    })
    .sort(
      (a, b) =>
        Number(
          (a as unknown as Record<string, unknown>).sortOrder ??
            builtInTools.findIndex((t) => t.id === a.id),
        ) -
        Number(
          (b as unknown as Record<string, unknown>).sortOrder ??
            builtInTools.findIndex((t) => t.id === b.id),
        ),
    );
  return { tools, categories };
});
export interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  minutes: number;
  sections: string[][];
  content?: string;
  tool?: string;
  featuredImage?: string;
  author?: string;
}
export async function blog(): Promise<Article[]> {
  if (!databaseConfigured()) return builtInArticles;
  return (await records('ssinfo_blog_posts'))
    .filter(
      (p) =>
        (p.status === 'published' || p.status === 'scheduled') &&
        (!p.publishDate || new Date(String(p.publishDate)) <= new Date()),
    )
    .map((p) => ({
      slug: String(p.slug),
      title: String(p.name),
      description: String(p.description || ''),
      category: String(p.category || 'GUIDE'),
      minutes: Math.max(
        1,
        Math.ceil(String(p.content || '').split(/\s+/).length / 200),
      ),
      sections: String(p.content || '')
        .split(/\n\n+/)
        .map((text) => ['', text]),
      content:
        p.contentFormat === 'html'
          ? cleanContent(String(p.content || ''))
          : textContent(String(p.content || '')),
      featuredImage: String(p.featuredImage || ''),
      author: String(p.author || ''),
    }));
}
export async function pageSEO(
  path: string,
  fallback: Metadata,
): Promise<Metadata> {
  if (!databaseConfigured()) return fallback;
  const [row] = await query<RecordRow>(
    "SELECT * FROM ssinfo_seo_pages WHERE slug=? AND status='active'",
    [path],
  );
  const config = await settings();
  let p: Record<string, unknown> = row ? unpack(row) : {};
  {
    const table = path.startsWith('/blog/')
      ? 'ssinfo_blog_posts'
      : path.startsWith('/tools/')
        ? 'ssinfo_tools'
        : 'ssinfo_tool_categories';
    const slug = path.split('/').filter(Boolean).at(-1) || '';
    const [content] = await query<RecordRow>(
      `SELECT * FROM ${table} WHERE slug=?`,
      [slug],
    );
    if (content)
      p = {
        ...unpack(content),
        ...Object.fromEntries(
          Object.entries(p).filter(([, v]) => v !== '' && v !== undefined),
        ),
      };
  }
  if (!Object.keys(p).length)
    return {
      ...fallback,
      robots: { index: config.allowIndexing !== false, follow: true },
    };
  return {
    ...fallback,
    title: p.seoTitle ? { absolute: String(p.seoTitle) } : fallback.title,
    keywords: String(p.seoKeywords || p.keywords || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    description: String(p.seoDescription || fallback.description || ''),
    alternates: { canonical: String(p.canonical || path) },
    robots: {
      index: config.allowIndexing !== false && !p.noindex,
      follow: true,
    },
    openGraph: {
      ...fallback.openGraph,
      ...(p.ogTitle || p.seoTitle
        ? { title: String(p.ogTitle || p.seoTitle) }
        : {}),
      description: String(
        p.ogDescription || p.seoDescription || fallback.description || '',
      ),
      ...(p.ogImage || config.ogImage
        ? { images: [String(p.ogImage || config.ogImage)] }
        : {}),
    },
    twitter: {
      ...fallback.twitter,
      ...(p.ogTitle || p.seoTitle
        ? { title: String(p.ogTitle || p.seoTitle) }
        : {}),
      description: String(
        p.ogDescription || p.seoDescription || fallback.description || '',
      ),
      ...(p.ogImage || config.ogImage
        ? { images: [String(p.ogImage || config.ogImage)] }
        : {}),
    },
  };
}

export async function contentPage(slug: string) {
  if (slug === '' || slug === 'contact') return null;
  if (!databaseConfigured()) {
    const info = information[slug];
    if (info)
      return {
        title: info.title,
        description: info.description,
        content: info.sections
          .map(([h, p]) => `<h2>${h}</h2>${textContent(p)}`)
          .join(''),
      };
    if (slug === 'contact')
      return {
        title: 'Have an idea? We are listening.',
        description: 'Get in touch with Informers Idea.',
        content: '',
      };
    return null;
  }
  const [row] = await query<RecordRow>(
    "SELECT * FROM ssinfo_seo_pages WHERE slug=? AND status='active'",
    ['/' + slug],
  );
  if (!row) return null;
  const p = unpack(row);
  return {
    title: String(
      p.pageTitle ||
        (information[slug] ||
        ![
          '',
          'all-tools',
          'blog',
          ...builtInCategories.map((c) => c.slug),
        ].includes(slug)
          ? p.name
          : '') ||
        '',
    ),
    description: String(p.description || ''),
    content: cleanContent(String(p.content || '')),
  };
}
