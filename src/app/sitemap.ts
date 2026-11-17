import type { MetadataRoute } from 'next';
import { catalog,blog,records,settings } from '@/server/content';
import { databaseConfigured } from '@/server/db';
export const dynamic='force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const {tools,categories}=await catalog();const articles=await blog();
  const config=await settings();if(config.allowIndexing===false)return [];
  const excluded=databaseConfigured()?(await records('ssinfo_seo_pages')).filter(p=>p.status==='active'&&p.noindex).map(p=>p.slug):[];
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
  ].filter(path=>!excluded.includes(path||'/')).map((path) => ({
    url: base + path,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
