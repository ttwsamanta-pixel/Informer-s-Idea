# Phase 2 architecture assessment

Audited 17 November 2026 against the actual checkout, including all route templates, tool processors, content registries, navigation, SEO files, ads, tests and deployment configuration.

- Next.js 16.4.6 App Router, React 19.3, TypeScript; Node >=22.13; production uses Webpack. One Hostinger Node deployment at informersidea.com. The .online deployment has been removed by the owner.
- Routes: homepage, all-tools, dynamic category/information pages, tools/[slug], blog and blog/[slug], sitemap and robots. Root layout currently supplies the public header/footer to every route.
- Tool definitions live in src/config/tools.ts; categories and articles have separate registries. Client workspaces dynamically load image/PDF/passport/OCR/QR/utility/signature processors. Converter hub additionally supports browser FFmpeg and text-only Word conversions.
- File processing is browser-only. Preserve these implementations and their limits. No file upload endpoint is needed.
- No existing database, authentication, sessions or analytics. src/lib/api/index.ts is an unused future-provider interface. AdSlot is a disabled placeholder.
- Metadata, JSON-LD, sitemap and robots currently use static configuration; NEXT_PUBLIC_SITE_URL is the only environment variable.
- Existing Playwright tests cover navigation, tools, editor, conversion and responsive behavior. Build verification uses an isolated checkout path because the apostrophe in the workspace path can break Webpack metadata processing.

## Implementation plan

1. Add a modular src/server backend behind Next.js route handlers; no Express process, second app or Laravel.
2. Add versioned MySQL migrations, safe registry seeding and a CLI-only first-admin bootstrap. Connect using a bounded mysql2 pool.
3. Add hashed-password authentication, revocable opaque sessions, permission checks, same-origin mutation protection, persistent rate limits and audit logs.
4. Isolate the admin visual shell from the public layout. Use the supplied navy sidebar, purple active states, pale cards and responsive dashboard. All metrics come from database queries; missing configuration is explicit.
5. Implement validated management resources and integrate public tool/blog/SEO reads without sending processing files to the server.
6. Add privacy-conscious opt-in analytics, Google Search Console connection, ad placements, subscription records and scoped API keys. External credentials are configured separately and never sent to the client.
7. Verify security and real MySQL behavior locally, run frontend regressions, and document Hostinger database/bootstrap configuration. Production database and Google/SMTP credentials remain owner configuration steps.
