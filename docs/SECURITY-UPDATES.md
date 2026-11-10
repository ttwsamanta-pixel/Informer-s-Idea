# Dependency security updates

## 2026-11-10

- Updated Next.js and eslint-config-next from 16.3.5 to 16.4.6.
- Refreshed the lockfile to use sharp 0.35.5, source-map-js 1.2.2, and patched brace-expansion versions 1.1.21 and 5.0.12.
- Overrode minimatch 10 with 11.0.1 for the TypeScript ESLint dependency tree to address GHSA-g3hv-75wg-m249. Recheck this override when updating typescript-eslint.
- npm audit reports zero critical, zero moderate, and two high dependency entries. These two entries refer to one unresolved issue: GHSA-mrhx-c7xc-m3w5 in Zod and its dependent @imgly/background-removal package.

### Remaining background-removal issue

The owner requested keeping the background-removal tool available while deploying the other fixes. @imgly/background-removal 1.7.0 requires Zod 3 and also bundles Zod code in its distribution. Overriding the installed Zod dependency alone would not fix the bundled implementation. Replace the library or adopt a verified patched upstream release before marking this issue resolved.

### Deployment verification

Both Hostinger applications must deploy the updated main branch and install dependencies from package-lock.json. A GitHub push or successful Vercel deployment does not confirm that either Hostinger application has updated. Check the Hostinger build log for Next.js 16.4.6 and rerun its vulnerability scan after deployment.
