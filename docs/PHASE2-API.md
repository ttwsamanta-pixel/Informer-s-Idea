# Same-app backend API

All routes begin `/api/v1`. Responses are `{ "success": true, "data": ... }` or `{ "success": false, "message": ... }`. Errors use 400 validation, 401 unauthenticated, 403 permission/origin, 404 unknown record, 409 duplicate, 429 rate limit or 503 unavailable/configuration pending. Responses are not cached.

Browser admin requests use the HttpOnly session cookie. Every mutation requires the exact configured `APP_URL` Origin and JSON bodies where applicable. CORS is not enabled. User input is validated and SQL values are parameterized; table names come from the internal resource allowlist.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/auth/login` | POST | email/password session login |
| `/auth/logout` | POST | revoke current session |
| `/auth/me` | GET | current identity, roles and permissions |
| `/auth/forgot-password` | POST | generic recovery response; SMTP required |
| `/auth/reset-password` | POST | one-time token and new password |
| `/public/catalog`, `/public/blog`, `/public/settings`, `/public/ads` | GET | public content and safe configuration |
| `/analytics/event` | POST | validated visitor event; analytics must be enabled |
| `/admin/dashboard` | GET | `start`/`end` date-filtered metrics |
| `/admin/resources/:resource` | GET, POST | list/create; `q`, `status`, `page` filters |
| `/admin/resources/:resource/:id` | PATCH, DELETE | edit or unpublish/disable |
| `/admin/users`, `/admin/users/:id` | GET/POST, PATCH | user accounts; super-admin writes |
| `/admin/roles` | GET | fixed roles and granted permissions |
| `/admin/settings` | GET, PUT | general settings and retention |
| `/admin/redirects`, `/admin/redirects/:id` | GET/POST, DELETE | internal 301 redirects |
| `/admin/api-keys`, `/admin/api-keys/:id` | GET/POST, DELETE | own keys; revoke by ID |
| `/admin/subscriptions` | GET, POST | manual membership grants |
| `/admin/payments`, `/admin/audit`, `/admin/api-usage` | GET | permission-controlled records |
| `/search-console/connect`, `/search-console/callback` | GET | authenticated OAuth flow |
| `/search-console` | GET | `property`, `dimension`, `start`, `end` report |
| `/catalog/tools`, `/catalog/categories`, `/catalog/blog` | GET | scoped Bearer API-key access |

Resource identifiers: tools, categories, posts, blog-categories, tags, seo, ads, campaigns, plans. Editable fields are defined in `src/config/admin.ts` and validated server-side. Adding a tool record uses an existing compiled processor ID; it cannot install executable code.

API keys are shown once and stored as hashes. Allowed scopes are `tools:read`, `categories:read`, `blog:read`. These keys cannot authenticate to `/admin/*`. There is no public conversion/upload endpoint.
