import { NextResponse, type NextRequest } from 'next/server';
import { databaseConfigured, query } from '@/server/db';
export async function proxy(req: NextRequest) {
  if (databaseConfigured()) {
    try {
      const [r] = await query<{ destination: string }>(
        'SELECT destination FROM ssinfo_seo_redirects WHERE source=?',
        [req.nextUrl.pathname],
      );
      if (
        r &&
        r.destination.startsWith('/') &&
        !r.destination.startsWith('//') &&
        r.destination !== req.nextUrl.pathname
      ) {
        const url = req.nextUrl.clone();
        url.pathname = r.destination;
        return NextResponse.redirect(url, 301);
      }
    } catch {
      console.error(JSON.stringify({ event: 'redirect_lookup_failed' }));
    }
  }
  return NextResponse.next();
}
export const config = {
  matcher: [
    '/((?!api|admin|_next|workers|logo|images|favicon|robots.txt|sitemap.xml).*)',
  ],
};
