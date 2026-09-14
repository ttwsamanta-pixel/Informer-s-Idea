import type { ToolDefinition } from '@/types/tools';
export function ToolStructuredData({
  tool,
  categoryName,
  categorySlug,
}: {
  tool: ToolDefinition;
  categoryName: string;
  categorySlug: string;
}) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: tool.name,
        description: tool.seoDescription,
        url: base + '/tools/' + tool.slug,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web browser',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          {
            '@type': 'ListItem',
            position: 2,
            name: categoryName,
            item: base + '/' + categorySlug,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tool.name,
            item: base + '/tools/' + tool.slug,
          },
        ],
      },
    ],
  };
  return (
    <script type="application/ld+json">
      {JSON.stringify(data).replace(/</g, '\\u003c')}
    </script>
  );
}
