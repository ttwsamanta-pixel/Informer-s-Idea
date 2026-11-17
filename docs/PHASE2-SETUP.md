# Phase 2: database and admin setup

The website and backend run in the **same Next.js Node application**. The admin is `/admin`; JSON endpoints are `/api/v1/*`. Only `informersidea.com` is the production destination. Browser file processing stays on the visitor's device.

## 1. Create the Hostinger database

In hPanel, select **informersidea.com** and open **Databases → Management** (or the MySQL database management page for its hosting plan). Create a dedicated database and database user with a strong password. Save the complete database/user names including Hostinger's prefix and the database hostname shown by hPanel. For Hostinger's managed Node/MySQL setup, use `127.0.0.1` rather than `localhost`, as specified in [Hostinger's Node/MySQL guide](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/). If the provider gives a different hostname for your specific database, use that value.

Keep the password in hPanel/private environment configuration, never in chat or GitHub. Do not expose the MySQL port to the public internet. If the provider requires TLS, set `DATABASE_SSL=true`; certificate verification stays enabled.

## 2. Configure this app

Under the **.com application's Environment variables**, set:

| Key | Value |
| --- | --- |
| `APP_URL` | `https://informersidea.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://informersidea.com` |
| `DATABASE_HOST` | `127.0.0.1` for Hostinger's managed MySQL | 
| `DATABASE_PORT` | Hostinger's port, usually `3306` |
| `DATABASE_NAME` | `u382937075_informersideas` |
| `DATABASE_USER` | `u382937075_informersideas` |
| `DATABASE_PASSWORD` | Database password |
| `DATABASE_SSL` | `true` if required by the database service |
| `ANALYTICS_HASH_SECRET` | Random secret generated below |
| `INTEGRATION_ENCRYPTION_KEY` | A separate random secret generated below |

Generate each secret independently on a trusted machine:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never add `NEXT_PUBLIC_` to a secret. Leave `TRUSTED_IP_HEADER` and `TRUSTED_COUNTRY_HEADER` blank until Hostinger confirms which headers its proxy overwrites. Without an IP header, public endpoint rate limits are shared; countries show Unknown. Do not blindly trust client-supplied forwarding headers.

All application tables use the fixed `ssinfo_` prefix, including `ssinfo_users`, `ssinfo_tools`, and `ssinfo_schema_migrations`. No extra prefix environment variable is needed. This schema is for your newly created database; it does not rename or delete existing unprefixed tables from an earlier local installation.

## 3. Apply migrations and create your administrator

Use a private SSH/application terminal **with access to this database**, inside the deployed project directory. The Node runtime and installed project dependencies must be available. If your managed plan has no application terminal, ask Hostinger for its supported one-off Node command/migration method. A remote local machine cannot connect unless the provider explicitly enables restricted remote access.

```sh
npm ci
npm run db:setup
```

This creates the versioned schema and seeds existing tool/category/blog content and fixed permission roles. It is repeatable and does not overwrite edited content. It never seeds traffic, payments, or subscribers.

Set private one-time `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables in that terminal (password at least 12 characters), then run:

```sh
npm run db:admin
```

Remove the bootstrap password from the environment afterward. There is no default production login, and the bootstrap command will not overwrite an existing account. Open `https://informersidea.com/admin/login` after deployment.

For local development, copy `.env.example` to ignored `.env.local`, enter local database settings, and run the same commands. Do not connect tests to the production database.

## 4. Deploy

Use Node 24.x, repository root `./`, build `npm run build`, output `.next`, and start `npm start`. Keep the existing GitHub connection and auto-deployment on the .com application. Do not recreate the removed .online application.

Run migrations **before enabling database variables on the running app**. If migrations are done in a separate terminal, supply credentials there first, then save the application's variables and redeploy. Without database variables the public site uses its existing registry and `/admin` shows setup instructions. Once database variables are supplied, connection failures are errors rather than silently showing old content.

## 5. Optional integrations

### Password-reset email

Set `SMTP_HOST`, `SMTP_PORT` (`587` or provider value), `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` using your mail service. Port 465 uses implicit TLS. Verify the sender with the provider and test a reset email before relying on recovery. Without SMTP, password-reset requests report that email configuration is pending.

### Google Search Console

Create a Google OAuth web application and enable the Search Console API. Configure consent/test users as required by Google, and add this exact authorized redirect URI:

`https://informersidea.com/api/v1/search-console/callback`

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The encryption key from step 2 must remain stable; rotating it requires reconnecting Google. In admin → Google Search Console, connect an account with a verified .com property. The integration requests read-only access and stores encrypted refresh tokens. Reports support dates, queries, pages, countries and devices; they are cached for 15 minutes. Google reporting dates use Pacific time and recent data can be delayed. No Google metrics are fabricated when disconnected.

References: [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

### Analytics and ads

Enable analytics in admin Settings after configuring its secret. Visitors can allow or decline tracking and withdraw consent. Events contain page/tool IDs and coarse device/referrer categories, never uploaded files or file names. Browser privacy signals are respected. Country data requires a trusted hosting header.

Ad slots support active/inactive state, placement, dates and device targeting. HTML ads run in sandboxed frames; scripts requiring top-level DOM access may not work. Campaign records are managed separately; automated campaign delivery, ad click/impression reporting, and payment settlement are not implemented.

### Subscriptions and API keys

Plans and manually granted subscriptions can be managed and expired memberships are excluded from premium counts. Payment collection/webhooks and paid-tool enforcement are **not enabled**; public browser tools remain free. API keys offer scoped, rate-limited read access to the catalog. They do not expose file conversion or admin privileges.

## Operations and recovery

- Schedule `npm run db:cleanup` daily with the app's private environment. Detailed analytics retention is configurable (7–365 days); session/reset tokens expire, audit logs retain one year. Aggregate daily totals remain.
- Take encrypted daily database backups and a backup before every migration. Keep off-server copies with restricted access and periodically restore into a separate test database. Provider website backups must be checked for database coverage.
- Preserve the Google-token encryption key securely with backups. Do not commit backups or `.env.local`.
- Roll back application code to the last known-good commit if necessary. Do not reverse schema changes by deleting production tables. Restore a tested backup only with an agreed recovery point.
- Check Runtime logs after deployment. API failures log endpoint/error codes, not passwords or document content.

## Verification

Production build: `npm run build`. Public regression tests: `npm test`.

For backend integration tests, start a built app on localhost:3200 with an isolated MySQL database, seed it, bootstrap a test admin and run `node scripts/test-backend.mjs`. Set `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` for your test account. The script refuses non-localhost URLs and creates test records. Never point the test app at production MySQL.

Implemented here: session authentication, fixed roles, user creation/editing, tools/categories/blog CRUD, page SEO and redirects, sitemap/robots controls, consented analytics, Search Console connector/reports, ad slots, plans/manual subscriptions, scoped API keys, settings and audit log. Custom role editing, uploaded media library, rich-text editing, comment moderation, scheduled email notifications, conversion quotas, payment checkout/webhooks and an API conversion worker are subsequent modules; they are not presented as working features.
