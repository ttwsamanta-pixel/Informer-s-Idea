export type Field = {
  key: string;
  label: string;
  type?:
    | 'text'
    | 'textarea'
    | 'number'
    | 'checkbox'
    | 'date'
    | 'select'
    | 'password';
  options?: string[];
  required?: boolean;
};
const name: Field = { key: 'name', label: 'Name', required: true };
const slug: Field = { key: 'slug', label: 'URL slug', required: true };
const description: Field = {
  key: 'description',
  label: 'Description',
  type: 'textarea',
};
const seo: Field[] = [
  { key: 'seoTitle', label: 'SEO title' },
  { key: 'seoDescription', label: 'SEO description', type: 'textarea' },
];
const order: Field = { key: 'sortOrder', label: 'Sort order', type: 'number' };
export const resources: Record<
  string,
  {
    title: string;
    table: string;
    permission: string;
    fields: Field[];
    statuses: string[];
  }
> = {
  tools: {
    title: 'Tools',
    table: 'ssinfo_tools',
    permission: 'tools',
    statuses: ['active', 'inactive'],
    fields: [
      name,
      slug,
      { key: 'processorId', label: 'Existing processor ID', required: true },
      { key: 'category', label: 'Category ID', required: true },
      { key: 'icon', label: 'Icon name' },
      { key: 'shortDescription', label: 'Short description', type: 'textarea' },
      { key: 'longDescription', label: 'Long description', type: 'textarea' },
      ...seo,
      { key: 'keywords', label: 'Keywords (comma separated)' },
      { key: 'featured', label: 'Featured', type: 'checkbox' },
      { key: 'popular', label: 'Popular', type: 'checkbox' },
      order,
    ],
  },
  categories: {
    title: 'Tool categories',
    table: 'ssinfo_tool_categories',
    permission: 'tools',
    statuses: ['active', 'inactive'],
    fields: [
      name,
      slug,
      { key: 'icon', label: 'Icon name' },
      {
        key: 'color',
        label: 'Color',
        type: 'select',
        options: ['blue', 'purple', 'green', 'red', 'orange', 'pink'],
      },
      description,
      ...seo,
      order,
    ],
  },
  posts: {
    title: 'Blog posts',
    table: 'ssinfo_blog_posts',
    permission: 'blog',
    statuses: ['draft', 'published', 'scheduled'],
    fields: [
      name,
      slug,
      { key: 'description', label: 'Excerpt', type: 'textarea' },
      {
        key: 'content',
        label: 'Article text (blank lines separate paragraphs)',
        type: 'textarea',
        required: true,
      },
      { key: 'category', label: 'Category' },
      { key: 'tags', label: 'Tags (comma separated)' },
      { key: 'author', label: 'Author' },
      { key: 'featuredImage', label: 'Featured image HTTPS URL' },
      { key: 'publishDate', label: 'Publish date (UTC)', type: 'date' },
      ...seo,
      { key: 'canonical', label: 'Canonical URL' },
    ],
  },
  'blog-categories': {
    title: 'Blog categories',
    table: 'ssinfo_blog_categories',
    permission: 'blog',
    statuses: ['active', 'inactive'],
    fields: [name, slug, description],
  },
  tags: {
    title: 'Blog tags',
    table: 'ssinfo_blog_tags',
    permission: 'blog',
    statuses: ['active', 'inactive'],
    fields: [name, slug],
  },
  seo: {
    title: 'Page SEO',
    table: 'ssinfo_seo_pages',
    permission: 'seo',
    statuses: ['active', 'inactive'],
    fields: [
      name,
      {
        key: 'slug',
        label: 'Page path (for example /tools/resize-image)',
        required: true,
      },
      ...seo,
      { key: 'canonical', label: 'Canonical HTTPS URL' },
      { key: 'noindex', label: 'Exclude from search', type: 'checkbox' },
      { key: 'ogTitle', label: 'Open Graph title' },
      { key: 'ogDescription', label: 'Open Graph description' },
      { key: 'ogImage', label: 'Open Graph image HTTPS URL' },
    ],
  },
  ads: {
    title: 'Ad slots',
    table: 'ssinfo_ad_slots',
    permission: 'ads',
    statuses: ['inactive', 'active'],
    fields: [
      name,
      slug,
      {
        key: 'placement',
        label: 'Placement',
        type: 'select',
        options: [
          'header',
          'homepage',
          'sidebar',
          'tool-top',
          'tool-bottom',
          'between-sections',
          'mobile',
          'footer',
        ],
      },
      {
        key: 'type',
        label: 'Ad type',
        type: 'select',
        options: ['image', 'html'],
      },
      { key: 'image', label: 'Image HTTPS URL' },
      { key: 'destination', label: 'Destination HTTPS URL' },
      {
        key: 'html',
        label: 'HTML / script (runs in an isolated sandbox)',
        type: 'textarea',
      },
      {
        key: 'device',
        label: 'Device',
        type: 'select',
        options: ['both', 'desktop', 'mobile'],
      },
      { key: 'startDate', label: 'Starts (UTC)', type: 'date' },
      { key: 'endDate', label: 'Ends (UTC)', type: 'date' },
      order,
    ],
  },
  campaigns: {
    title: 'Ad campaigns',
    table: 'ssinfo_ad_campaigns',
    permission: 'ads',
    statuses: ['inactive', 'active'],
    fields: [
      name,
      slug,
      description,
      { key: 'startDate', label: 'Starts (UTC)', type: 'date' },
      { key: 'endDate', label: 'Ends (UTC)', type: 'date' },
    ],
  },
  plans: {
    title: 'Plans',
    table: 'ssinfo_plans',
    permission: 'subscriptions',
    statuses: ['inactive', 'active'],
    fields: [
      name,
      slug,
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'currency', label: 'Currency code' },
      {
        key: 'billingPeriod',
        label: 'Billing period',
        type: 'select',
        options: ['month', 'year'],
      },
      { key: 'features', label: 'Features', type: 'textarea' },
      { key: 'fileLimitMB', label: 'File limit MB', type: 'number' },
      { key: 'usageLimit', label: 'Monthly usage limit', type: 'number' },
    ],
  },
};
export const adminNavigation = [
  { label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin' },
  {
    label: 'Users & access',
    icon: 'Users',
    children: [
      ['All users', 'users'],
      ['Roles & permissions', 'roles'],
    ],
  },
  {
    label: 'Tools',
    icon: 'Wrench',
    children: [
      ['All tools', 'tools'],
      ['Categories', 'categories'],
    ],
  },
  {
    label: 'Blog',
    icon: 'FileText',
    children: [
      ['All posts', 'posts'],
      ['Categories', 'blog-categories'],
      ['Tags', 'tags'],
    ],
  },
  {
    label: 'SEO & marketing',
    icon: 'TrendingUp',
    children: [
      ['Page SEO', 'seo'],
      ['Redirects', 'redirects'],
      ['Sitemap & robots', 'indexing'],
    ],
  },
  {
    label: 'Google Search Console',
    icon: 'Globe',
    href: '/admin/search-console',
  },
  { label: 'Analytics', icon: 'ChartNoAxesCombined', href: '/admin/analytics' },
  {
    label: 'Ads management',
    icon: 'Megaphone',
    children: [
      ['Ad slots', 'ads'],
      ['Campaigns', 'campaigns'],
    ],
  },
  {
    label: 'Subscriptions',
    icon: 'Crown',
    children: [
      ['Plans', 'plans'],
      ['Subscriptions', 'subscriptions'],
      ['Payments', 'payments'],
    ],
  },
  {
    label: 'API management',
    icon: 'Code',
    children: [
      ['API keys', 'api-keys'],
      ['Usage', 'api-usage'],
      ['Documentation', 'api-docs'],
    ],
  },
  {
    label: 'Settings',
    icon: 'Settings',
    children: [
      ['General & branding', 'settings'],
      ['Activity log', 'audit'],
    ],
  },
];
export const permissionNames = [
  'dashboard',
  'users',
  'tools',
  'blog',
  'seo',
  'analytics',
  'search-console',
  'ads',
  'subscriptions',
  'api',
  'settings',
];
