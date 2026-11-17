import type { MetadataRoute } from 'next';
import { settings } from '@/server/content';
export const dynamic='force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const config=await settings();
  return {
    rules: { userAgent: '*', ...(config.allowIndexing===false?{disallow:'/'}:{allow:'/',disallow:['/admin','/api/']}) },
    sitemap:
      (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') +
      '/sitemap.xml',
  };
}
