import type { MetadataRoute } from 'next';
import { tools } from '@/config/tools';
import { categories } from '@/config/categories';
import { articles } from '@/config/articles';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return [
    '',
    '/all-tools',
    ...categories.map((c) => '/' + c.slug),
    ...tools.map((t) => '/tools/' + t.slug),
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms-of-use',
    '/disclaimer',
    '/blog',
    ...articles.map((a) => '/blog/' + a.slug),
  ].map((path) => ({
    url: base + path,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
