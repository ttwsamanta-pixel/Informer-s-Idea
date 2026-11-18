'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  TrendingUp,
  Globe,
  ChartNoAxesCombined,
  Megaphone,
  Crown,
  Code,
  Settings,
  Search,
  Menu,
  ChevronDown,
  ArrowUpRight,
  Plus,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  ShieldCheck,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { adminNavigation, resources, type Field } from '@/config/admin';
import type { AdminUser } from '@/server/auth';
type Row = Record<string, unknown>;
const icons = {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  TrendingUp,
  Globe,
  ChartNoAxesCombined,
  Megaphone,
  Crown,
  Code,
  Settings,
};
function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((d) => {
        if (active) {
          setData(d);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error, reload: () => setRevision((v) => v + 1) };
}
export function AdminApp({
  section,
  user,
}: {
  section: string;
  user: AdminUser;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  return (
    <div className="admin-shell">
      <aside className={'admin-sidebar ' + (open ? 'is-open' : '')}>
        <Link className="admin-brand" href="/admin">
          <img src="/logo/icon.svg" alt="" width="42" height="52" />
          <span>
            Informer’s <em>Idea</em>
            <small>Admin Panel</small>
          </span>
        </Link>
        <nav aria-label="Administration">
          {adminNavigation.map((item) => {
            const Icon = icons[item.icon as keyof typeof icons];
            return item.children ? (
              <details
                key={item.label}
                open={item.children.some(([, s]) => s === section)}
              >
                <summary>
                  <Icon size={19} />
                  {item.label}
                  <ChevronDown size={14} />
                </summary>
                {item.children.map(([label, s]) => (
                  <Link
                    aria-current={section === s ? 'page' : undefined}
                    className={section === s ? 'active' : ''}
                    href={'/admin/' + s}
                    key={s}
                  >
                    {label}
                  </Link>
                ))}
              </details>
            ) : (
              <Link
                key={item.label}
                href={item.href!}
                className={
                  (
                    item.href === '/admin'
                      ? section === 'dashboard'
                      : item.href === '/admin/' + section
                  )
                    ? 'active'
                    : ''
                }
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <ShieldCheck size={24} />
          <strong>Your platform. Your control.</strong>
          <p>Tools, content and insights in one place.</p>
          <Link href="/" target="_blank">
            Visit website <ExternalLink size={14} />
          </Link>
        </div>
      </aside>
      {open && (
        <button
          className="admin-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            aria-label="Toggle navigation"
            className="admin-icon"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <form className="admin-search" action="/admin/tools">
            <Search size={18} />
            <input
              name="q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools…"
              aria-label="Search tools"
            />
          </form>
          <div className="admin-profile">
            <span className="admin-avatar">{user.name.charAt(0)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.roles.join(', ')}</small>
            </span>
            <button
              className="admin-icon"
              aria-label="Sign out"
              onClick={async () => {
                await api('auth/logout', { method: 'POST' });
                router.replace('/admin/login');
                router.refresh();
              }}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main className="admin-content" id="main">
          <div className="admin-breadcrumb">
            Administration <span>/</span>{' '}
            {resources[section]?.title || section.replaceAll('-', ' ')}
          </div>
          {['dashboard', 'analytics'].includes(section) ? (
            <Dashboard />
          ) : resources[section] ? (
            <ResourceEditor resource={section} />
          ) : (
            <Management section={section} />
          )}
        </main>
        <footer className="admin-footer">
          © {new Date().getFullYear()} Informer’s Idea{' '}
          <span>Secure administration · All times UTC</span>
        </footer>
      </div>
    </div>
  );
}
function Heading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p className="admin-error" role="alert">
      {message}
    </p>
  ) : null;
}
function Empty({
  text = 'No records yet. New activity will appear here.',
}: {
  text?: string;
}) {
  return (
    <div className="admin-empty">
      <ChartNoAxesCombined size={30} />
      <p>{text}</p>
    </div>
  );
}
function Breakdown({ rows }: { rows: Row[] }) {
  const total = rows.reduce((s, r) => s + Number(r.value), 0);
  return rows.length ? (
    <div className="admin-breakdown">
      {rows.map((r) => (
        <div key={String(r.name)}>
          <span>{String(r.name)}</span>
          <strong>{Number(r.value).toLocaleString()}</strong>
          <div>
            <i
              style={{
                width: Math.round((Number(r.value) / total) * 100) + '%',
              }}
            />
          </div>
          <small>{((Number(r.value) / total) * 100).toFixed(1)}%</small>
        </div>
      ))}
    </div>
  ) : (
    <Empty />
  );
}
function Dashboard() {
  const [period, setPeriod] = useState('30'),
    [customStart, setCustomStart] = useState(''),
    [customEnd, setCustomEnd] = useState(''),
    [metric, setMetric] = useState('visitors');
  const today = new Date();
  const end = new Date(today),
    start = new Date(today);
  if (period === 'yesterday') {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setUTCDate(end.getUTCDate() - 1);
  } else if (period === 'month') start.setUTCDate(1);
  else if (period === 'last-month') {
    start.setUTCMonth(start.getUTCMonth() - 1, 1);
    end.setUTCDate(0);
  } else start.setUTCDate(start.getUTCDate() - (Number(period) || 1) + 1);
  const range = new URLSearchParams({
    start:
      period === 'custom' && customStart
        ? customStart
        : start.toISOString().slice(0, 10),
    end:
      period === 'custom' && customEnd
        ? customEnd
        : end.toISOString().slice(0, 10),
  });
  const { data, error } = useData<Row>('admin/dashboard?' + range);
  const days = (data?.days || []) as Row[],
    values = days.map((d) => Number(d[metric])),
    max = Math.max(4, Math.ceil(Math.max(0, ...values) / 4) * 4);
  const points = values
    .map(
      (v, i) =>
        `${40 + (i * 660) / Math.max(1, values.length - 1)},${210 - (v / max) * 170}`,
    )
    .join(' ');
  const cards = [
    ['Total visitors', 'visitors', Users, 'purple'],
    ['Page views', 'pageViews', Eye, 'blue'],
    ['Tools used', 'toolUses', Wrench, 'green'],
    ['Registered users', 'users', Users, 'pink'],
    ['Premium users', 'premium', Crown, 'orange'],
  ] as const;
  return (
    <>
      <Heading
        title="Dashboard"
        subtitle="Welcome back! Here’s what’s happening with Informer’s Idea."
      >
        <label className="admin-date">
          <CalendarDays size={18} />
          <select
            aria-label="Dashboard date range"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="1">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="month">This month</option>
            <option value="last-month">Last month</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
      </Heading>
      {period === 'custom' && (
        <div className="admin-inline">
          <label>
            From
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </label>
        </div>
      )}
      <ErrorNotice message={error} />
      <div className="admin-stats">
        {cards.map(([label, key, Icon, color]) => (
          <section className="admin-card admin-stat" key={key}>
            <span className={'admin-stat-icon ' + color}>
              <Icon size={25} />
            </span>
            <div>
              <p>{label}</p>
              <strong>
                {data ? Number(data[key] || 0).toLocaleString() : '—'}
              </strong>
            </div>
            <small>
              {key === 'users' || key === 'premium'
                ? 'Current total'
                : 'Selected date range'}
            </small>
          </section>
        ))}
      </div>
      <div className="admin-chart-row">
        <section className="admin-card">
          <div className="admin-card-title">
            <h2>
              <ChartNoAxesCombined />
              Visitors overview
            </h2>
            <div className="admin-tabs">
              {[
                ['visitors', 'Visitors'],
                ['pageViews', 'Page views'],
                ['toolUses', 'Tool uses'],
              ].map(([key, title]) => (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
                  className={metric === key ? 'active' : ''}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
          {days.length ? (
            <svg
              viewBox="0 0 740 250"
              role="img"
              aria-label={metric + ' over selected period'}
              className="admin-chart"
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#793cff" stopOpacity=".3" />
                  <stop offset="1" stopColor="#793cff" stopOpacity=".02" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((n) => (
                <g key={n}>
                  <line
                    x1="40"
                    x2="700"
                    y1={40 + n * 42.5}
                    y2={40 + n * 42.5}
                    stroke="#e9eaf6"
                  />
                  <text x="0" y={44 + n * 42.5} fontSize="10" fill="#75809e">
                    {Math.round((max * (4 - n)) / 4)}
                  </text>
                </g>
              ))}
              <polygon
                points={`40,210 ${points} ${40 + ((values.length - 1) * 660) / Math.max(1, values.length - 1)},210`}
                fill="url(#chart-fill)"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#793cff"
                strokeWidth="3"
              />
              {days.map((d, i) => (
                <circle
                  key={i}
                  cx={40 + (i * 660) / Math.max(1, days.length - 1)}
                  cy={210 - (Number(d[metric]) / max) * 170}
                  r="4"
                  fill="#793cff"
                >
                  <title>
                    {String(d.day)}: {String(d[metric])}
                  </title>
                </circle>
              ))}
              <text x="40" y="238" fontSize="11">
                {String(data?.start)}
              </text>
              <text x="630" y="238" fontSize="11">
                {String(data?.end)}
              </text>
            </svg>
          ) : (
            <Empty text="No visitor activity in this period. Enable analytics in Settings to begin collecting consented visits." />
          )}
        </section>
        <section className="admin-card">
          <h2>
            <Globe />
            Visitors by country
          </h2>
          <Breakdown rows={(data?.countries || []) as Row[]} />
          <small>
            Unknown means country information was not supplied by a trusted
            hosting proxy.
          </small>
        </section>
      </div>
      <div className="admin-three">
        <section className="admin-card">
          <div className="admin-card-title">
            <h2>
              <Crown />
              Most used tools
            </h2>
            <Link href="/admin/tools">View tools ↗</Link>
          </div>
          <Breakdown rows={(data?.topTools || []) as Row[]} />
        </section>
        <section className="admin-card">
          <h2>
            <TrendingUp />
            Traffic sources
          </h2>
          <Breakdown rows={(data?.sources || []) as Row[]} />
        </section>
        <section className="admin-card">
          <h2>
            <Monitor />
            Device overview
          </h2>
          <div className="admin-device-icons">
            <Monitor />
            <Smartphone />
            <Tablet />
          </div>
          <Breakdown rows={(data?.devices || []) as Row[]} />
        </section>
      </div>
      <section className="admin-card">
        <h2>Quick actions</h2>
        <div className="admin-actions">
          {[
            ['tools', 'Add a tool', Plus],
            ['posts', 'Write a blog post', FileText],
            ['seo', 'Manage SEO', TrendingUp],
            ['ads', 'Manage ads', Megaphone],
            ['plans', 'Manage plans', Crown],
            ['search-console', 'Search performance', ChartNoAxesCombined],
          ].map(([href, label, Icon]) => {
            const I = Icon as typeof Plus;
            return (
              <Link key={String(href)} href={'/admin/' + href}>
                <I size={26} />
                {String(label)}
              </Link>
            );
          })}
        </div>
      </section>
      <div className="admin-three">
        <section className="admin-card">
          <h2>Published blog posts</h2>
          <strong className="admin-big">{String(data?.posts ?? '—')}</strong>
        </section>
        <section className="admin-card">
          <h2>Recorded revenue</h2>
          {((data?.revenue as Row[]) || []).length ? (
            (data?.revenue as Row[]).map((r) => (
              <p key={String(r.currency)}>
                {String(r.currency)} {Number(r.value).toFixed(2)}
              </p>
            ))
          ) : (
            <p>No recorded payments. Payment provider connection is pending.</p>
          )}
        </section>
        <section className="admin-card">
          <h2>Search Console</h2>
          <p>
            See clicks, impressions, CTR and position from your verified Google
            property.
          </p>
          <Link href="/admin/search-console">
            Open search reports <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
      <section className="admin-card">
        <h2>Top pages</h2>
        <Breakdown rows={(data?.topPages || []) as Row[]} />
      </section>
    </>
  );
}
function Table({
  rows,
  actions,
}: {
  rows: Row[];
  actions?: (r: Row) => React.ReactNode;
}) {
  if (!rows.length) return <Empty />;
  const columns = Object.keys(rows[0])
    .filter((k) => !['data', 'password_hash', 'encrypted_tokens'].includes(k))
    .slice(0, 7);
  return (
    <div className="admin-table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c.replaceAll('_', ' ')}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id || i)}>
              {columns.map((c) => (
                <td key={c}>
                  {typeof r[c] === 'object'
                    ? JSON.stringify(r[c])
                    : String(r[c] ?? '—')}
                </td>
              ))}
              {actions && <td>{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Fields({ fields, initial = {} }: { fields: Field[]; initial?: Row }) {
  return (
    <>
      {fields.map((f) => (
        <label key={f.key} className={f.type === 'textarea' ? 'wide' : ''}>
          {f.label}
          {f.type === 'checkbox' ? (
            <input
              name={f.key}
              type="checkbox"
              defaultChecked={Boolean(initial[f.key])}
            />
          ) : f.type === 'select' ? (
            <select
              name={f.key}
              defaultValue={String(initial[f.key] || f.options?.[0] || '')}
            >
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              name={f.key}
              required={f.required}
              rows={f.key === 'content' ? 12 : 3}
              defaultValue={String(initial[f.key] || '')}
            />
          ) : (
            <input
              name={f.key}
              required={f.required}
              type={f.type === 'date' ? 'datetime-local' : f.type || 'text'}
              min={f.type === 'number' ? 0 : undefined}
              step={f.type === 'number' ? 'any' : undefined}
              defaultValue={String(initial[f.key] ?? '')}
            />
          )}
        </label>
      ))}
    </>
  );
}
function ResourceEditor({ resource }: { resource: string }) {
  const config = resources[resource],
    fields = config.fields;
  const [q, setQ] = useState(() =>
      typeof window !== 'undefined'
        ? new URLSearchParams(location.search).get('q') || ''
        : '',
    ),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(''),
    [edit, setEdit] = useState<Row | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const state = useData<{ items: Row[]; total: number }>(
    'admin/resources/' +
      resource +
      '?' +
      new URLSearchParams({ q, page: String(page), status }),
  );
  return (
    <>
      <Heading
        title={config.title}
        subtitle="Manage the content that appears on your website."
      >
        <button className="admin-primary" onClick={() => setEdit({})}>
          <Plus size={17} />
          Add {resource === 'posts' ? 'post' : 'record'}
        </button>
      </Heading>
      <ErrorNotice message={error || state.error} />
      {resource === 'tools' && (
        <p className="admin-notice">
          Tool records configure existing browser processors. Creating a new
          processing engine still requires implementation in code.
        </p>
      )}
      {resource === 'plans' && (
        <p className="admin-notice">
          Plan records and subscription grants are available. Checkout and paid
          processing limits are not enabled until a payment provider and
          enforcement policy are connected.
        </p>
      )}
      <section className="admin-card">
        <div className="admin-list-toolbar">
          <input
            aria-label="Search records"
            placeholder="Search by name…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {config.statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span>{state.data?.total || 0} records</span>
        </div>
        <Table
          rows={(state.data?.items || []).map((r) => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            status: r.status,
            updated: r.updatedAt,
          }))}
          actions={(r) => (
            <button
              className="admin-secondary"
              onClick={() =>
                setEdit(state.data!.items.find((i) => i.id === r.id)!)
              }
            >
              Edit
            </button>
          )}
        />
        <div className="admin-pagination">
          <button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
            Previous
          </button>
          <span>Page {page}</span>
          <button
            disabled={page * 50 >= (state.data?.total || 0)}
            onClick={() => setPage((v) => v + 1)}
          >
            Next
          </button>
        </div>
      </section>
      {edit && (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit record"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const f = new FormData(e.currentTarget),
                body: Row = { status: f.get('status') };
              fields.forEach((field) => {
                body[field.key] =
                  field.type === 'checkbox'
                    ? f.has(field.key)
                    : field.type === 'number'
                      ? Number(f.get(field.key) || 0)
                      : String(f.get(field.key) || '');
              });
              try {
                await api(
                  'admin/resources/' +
                    resource +
                    (edit.id ? '/' + edit.id : ''),
                  {
                    method: edit.id ? 'PATCH' : 'POST',
                    body: JSON.stringify(body),
                  },
                );
                setEdit(null);
                state.reload();
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="admin-card-title">
              <h2>
                {edit.id ? 'Edit' : 'Create'} {config.title.toLowerCase()}
              </h2>
              <button
                type="button"
                aria-label="Close editor"
                onClick={() => setEdit(null)}
              >
                ✕
              </button>
            </div>
            <ErrorNotice message={error} />
            <div className="admin-form-grid">
              <Fields fields={fields} initial={edit} />
              <label>
                Status
                <select
                  name="status"
                  defaultValue={String(edit.status || config.statuses[0])}
                >
                  {config.statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button disabled={busy} className="admin-primary">
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function Management({ section }: { section: string }) {
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [edit, setEdit] = useState<Row | null>(null);
  const endpoint =
    section === 'indexing' || section === 'api-docs'
      ? 'admin/settings'
      : section === 'search-console'
        ? 'search-console'
        : 'admin/' + section;
  const { data, error: loadError, reload } = useData<unknown>(endpoint);
  const perform = async (path: string, body: unknown, method = 'POST') => {
    setError('');
    setMessage('');
    try {
      const result = await api<Row>(path, {
        method,
        body: JSON.stringify(body),
      });
      setMessage(result.key ? String(result.key) : 'Saved successfully.');
      setEdit(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const rows = Array.isArray(data) ? (data as Row[]) : [];
  const title = section
    .replaceAll('-', ' ')
    .replace(/^./, (c) => c.toUpperCase());
  if (section === 'search-console') return <SearchConsole />;
  return (
    <>
      <Heading
        title={title}
        subtitle="Manage your platform with secure, permission-based controls."
      />
      <ErrorNotice
        message={
          error ||
          (!['indexing', 'api-docs'].includes(section) ? loadError : '')
        }
      />
      {message && (
        <p className="admin-success" role="status">
          {message}
        </p>
      )}
      {section === 'settings' ? (
        <section className="admin-card">
          {Boolean(data) && (
            <form
              key={JSON.stringify(data)}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void perform(
                  'admin/settings',
                  {
                    siteTitle: f.get('siteTitle'),
                    description: f.get('description'),
                    ogImage: f.get('ogImage'),
                    analyticsEnabled: f.has('analyticsEnabled'),
                    allowIndexing: f.has('allowIndexing'),
                    retentionDays: Number(f.get('retentionDays')),
                  },
                  'PUT',
                );
              }}
            >
              <div className="admin-form-grid">
                <Fields
                  initial={data as Row}
                  fields={[
                    { key: 'siteTitle', label: 'Site title', required: true },
                    {
                      key: 'description',
                      label: 'Description',
                      type: 'textarea',
                    },
                    {
                      key: 'ogImage',
                      label: 'Default Open Graph image HTTPS URL',
                    },
                    {
                      key: 'analyticsEnabled',
                      label: 'Enable Google Analytics',
                      type: 'checkbox',
                    },
                    {
                      key: 'allowIndexing',
                      label: 'Allow public search indexing',
                      type: 'checkbox',
                    },
                    {
                      key: 'retentionDays',
                      label: 'Analytics detail retention (7–365 days)',
                      type: 'number',
                    },
                  ]}
                />
              </div>
              <button className="admin-primary">Save settings</button>
            </form>
          )}
        </section>
      ) : section === 'indexing' ? (
        <section className="admin-card">
          <h2>Sitemap & robots</h2>
          <p>
            The sitemap includes active public tools, categories and published
            articles. Admin, API and private pages are excluded.
          </p>
          <p>
            <a href="/sitemap.xml" target="_blank">
              Open sitemap.xml ↗
            </a>
          </p>
          <p>
            <a href="/robots.txt" target="_blank">
              Open robots.txt ↗
            </a>
          </p>
          <p>
            Manage global indexing in Settings and individual indexing in Page
            SEO.
          </p>
        </section>
      ) : section === 'api-docs' ? (
        <section className="admin-card">
          <h2>Content API v1</h2>
          <p>Send an API key in the Authorization: Bearer header.</p>
          <pre>
            GET /api/v1/catalog/tools{'\n'}GET /api/v1/catalog/categories{'\n'}
            GET /api/v1/catalog/blog
          </pre>
          <p>
            Scopes: tools:read, categories:read, blog:read. Keys cannot access
            administration endpoints. Rate limits return HTTP 429.
          </p>
          <p>Responses: {'{ "success": true, "data": ... }'}</p>
          <p>
            These APIs expose content metadata. File processing stays in the
            browser.
          </p>
        </section>
      ) : (
        <section className="admin-card">
          {section === 'users' && (
            <button
              className="admin-primary"
              onClick={() => setEdit({ status: 'active', role: 'Support' })}
            >
              <Plus size={16} />
              Add user
            </button>
          )}
          {section === 'api-keys' && (
            <form
              className="admin-inline"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void perform('admin/api-keys', {
                  name: f.get('name'),
                  rateLimit: 60,
                  scopes: ['tools:read', 'categories:read', 'blog:read'],
                });
              }}
            >
              <input
                name="name"
                placeholder="Key name"
                required
                maxLength={120}
              />
              <button className="admin-primary">Create read-only key</button>
            </form>
          )}
          {section === 'redirects' && (
            <form
              className="admin-inline"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void perform('admin/redirects', {
                  source: f.get('source'),
                  destination: f.get('destination'),
                });
              }}
            >
              <input name="source" placeholder="/old-path" required />
              <input name="destination" placeholder="/new-path" required />
              <button className="admin-primary">Add permanent redirect</button>
            </form>
          )}
          {section === 'subscriptions' && (
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void perform('admin/subscriptions', {
                  userId: f.get('userId'),
                  planId: f.get('planId'),
                  status: 'active',
                  startsAt: new Date(
                    String(f.get('startsAt')) + 'Z',
                  ).toISOString(),
                  endsAt: new Date(String(f.get('endsAt')) + 'Z').toISOString(),
                });
              }}
            >
              <Fields
                fields={[
                  { key: 'userId', label: 'User ID', required: true },
                  { key: 'planId', label: 'Plan ID', required: true },
                  {
                    key: 'startsAt',
                    label: 'Starts (UTC)',
                    type: 'date',
                    required: true,
                  },
                  {
                    key: 'endsAt',
                    label: 'Expires (UTC)',
                    type: 'date',
                    required: true,
                  },
                ]}
              />
              <button className="admin-primary">Grant subscription</button>
            </form>
          )}
          {section === 'payments' && (
            <p>
              Payment records will appear after a verified payment provider is
              connected. No payments are collected by this app yet.
            </p>
          )}
          <Table
            rows={rows}
            actions={
              section === 'users'
                ? (r) => (
                    <button
                      onClick={() =>
                        setEdit({
                          ...r,
                          role: String(r.roles || 'Support').split(',')[0],
                        })
                      }
                    >
                      Edit
                    </button>
                  )
                : section === 'api-keys'
                  ? (r) => (
                      <button
                        disabled={Boolean(r.revoked_at)}
                        onClick={() =>
                          void perform('admin/api-keys/' + r.id, {}, 'DELETE')
                        }
                      >
                        Revoke
                      </button>
                    )
                  : section === 'redirects'
                    ? (r) => (
                        <button
                          onClick={() =>
                            void perform(
                              'admin/redirects/' + r.id,
                              {},
                              'DELETE',
                            )
                          }
                        >
                          Remove
                        </button>
                      )
                    : undefined
            }
          />
        </section>
      )}
      {edit && section === 'users' && (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit user"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void perform(
                'admin/users' + (edit.id ? '/' + edit.id : ''),
                {
                  name: f.get('name'),
                  email: f.get('email'),
                  status: f.get('status'),
                  role: f.get('role'),
                  ...(f.get('password') ? { password: f.get('password') } : {}),
                },
                edit.id ? 'PATCH' : 'POST',
              );
            }}
          >
            <h2>{edit.id ? 'Edit account' : 'New account'}</h2>
            <ErrorNotice message={error} />
            <Fields
              initial={edit}
              fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'email', label: 'Email', required: true },
                {
                  key: 'password',
                  label: 'New password (12+ characters)',
                  type: 'password',
                  required: !edit.id,
                },
                {
                  key: 'status',
                  label: 'Status',
                  type: 'select',
                  options: ['active', 'inactive'],
                },
                {
                  key: 'role',
                  label: 'Role',
                  type: 'select',
                  options: [
                    'Super Admin',
                    'Admin',
                    'Editor',
                    'SEO Manager',
                    'Analyst',
                    'Ad Manager',
                    'Support',
                  ],
                },
              ]}
            />
            <div className="admin-form-actions">
              <button type="button" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button className="admin-primary">Save account</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function SearchConsole() {
  const [property, setProperty] = useState(''),
    [dimension, setDimension] = useState('date'),
    [start, setStart] = useState(() =>
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const { data, error } = useData<Row>(
    'search-console?' +
      new URLSearchParams({ property, dimension, start, end }),
  );
  return (
    <>
      <Heading
        title="Google Search Console"
        subtitle="Search performance from your verified Google property."
      >
        <button
          className="admin-primary"
          onClick={() => {
            // OAuth requires a full browser request, not a client-side RSC navigation.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/api/v1/search-console/connect';
          }}
        >
          Connect Google property
        </button>
      </Heading>
      <ErrorNotice message={error} />
      <section className="admin-card">
        <div className="admin-inline">
          <select
            aria-label="Google property"
            value={property}
            onChange={(e) => setProperty(e.target.value)}
          >
            <option value="">Select property</option>
            {((data?.properties || []) as Row[]).map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {String(p.property_url)}
              </option>
            ))}
          </select>
          <select
            aria-label="Report dimension"
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
          >
            {['date', 'query', 'page', 'country', 'device'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="admin-inline">
          <label>
            From
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        {!property ? (
          <Empty text="Connect your Google account, then select a verified property for informersidea.com. No sample data is displayed." />
        ) : (
          <Table
            rows={((data?.rows || []) as Row[]).map((r) => ({
              ...r,
              ctr: (Number(r.ctr) * 100).toFixed(2) + '%',
            }))}
          />
        )}
        <p>
          Selected dates use Google&apos;s Pacific time reporting. Google may
          delay recent search data. OAuth credentials must be configured on the
          server.
        </p>
      </section>
    </>
  );
}
