import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/server/auth';
import { databaseConfigured } from '@/server/db';
import { AdminApp } from '@/components/admin/admin-app';
import { AuthForm } from '@/components/admin/auth-form';
import { resources } from '@/config/admin';
export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const parts = (await params).section || [];
  const section = parts[0] || 'dashboard';
  if (parts.length > 1) notFound();
  if (['login', 'forgot-password', 'reset-password'].includes(section))
    return <AuthForm mode={section} />;
  if (!databaseConfigured())
    return (
      <div className="admin-setup">
        <img src="/logo/icon.svg" alt="" width="64" height="64" />
        <h1>Your admin panel is ready for setup</h1>
        <p>
          Connect your MySQL database and create the first administrator to open
          the dashboard.
        </p>
        <ol>
          <li>Create a MySQL database in Hostinger.</li>
          <li>
            Add DATABASE_HOST, DATABASE_NAME, DATABASE_USER and
            DATABASE_PASSWORD to this app’s environment.
          </li>
          <li>
            Run <code>npm run db:setup</code>, then{' '}
            <code>npm run db:admin</code> with your private ADMIN_EMAIL and
            ADMIN_PASSWORD environment variables.
          </li>
        </ol>
        <p>
          Follow <strong>docs/PHASE2-SETUP.md</strong> in the project. Your
          public tools continue to work.
        </p>
        <Link href="/">Return to website</Link>
      </div>
    );
  const user = await currentUser();
  if (!user) redirect('/admin/login');
  const permission =
    resources[section]?.permission ||
    (
      {
        dashboard: 'dashboard',
        users: 'users',
        roles: 'users',
        analytics: 'analytics',
        'search-console': 'search-console',
        redirects: 'seo',
        indexing: 'seo',
        settings: 'settings',
        audit: 'settings',
        subscriptions: 'subscriptions',
        payments: 'subscriptions',
        'api-keys': 'api',
        'api-usage': 'api',
        'api-docs': 'api',
      } as Record<string, string>
    )[section];
  if (!permission) notFound();
  if (!user.permissions.includes('*') && !user.permissions.includes(permission))
    return (
      <div className="admin-setup">
        <h1>Access restricted</h1>
        <p>Your role does not have permission to open this section.</p>
        <Link href="/admin">Return to dashboard</Link>
      </div>
    );
  return <AdminApp key={section} section={section} user={user} />;
}
