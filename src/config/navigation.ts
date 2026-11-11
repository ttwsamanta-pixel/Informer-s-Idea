import { categories, type CategoryId } from './categories';
import { tools } from './tools';
import type { ToolDefinition } from '@/types/tools';
export const navigationMenus = categories.map((category) => ({
  id: category.id,
  label: category.id === 'passport' ? 'Passport Photo' : category.name,
  categoryIds: [category.id] as CategoryId[],
  href: '/' + category.slug,
  description: category.description,
}));
export type NavigationMenu = (typeof navigationMenus)[number];
export interface MenuGroup {
  title: string;
  category: (typeof categories)[number];
  items: ToolDefinition[];
}
export function menuGroups(menu: NavigationMenu): MenuGroup[] {
  if (menu.id === 'image' || menu.id === 'pdf') {
    const category = categories.find((c) => c.id === menu.id)!;
    const definitions =
      menu.id === 'image'
        ? [
            {
              title: 'Resize & organize',
              operations: ['resize', 'crop', 'rotate', 'flip'],
            },
            {
              title: 'Compress & convert',
              operations: ['compress', 'convert'],
            },
            {
              title: 'Effects & finishing',
              operations: [
                'grayscale',
                'blur',
                'brightness',
                'contrast',
                'text',
              ],
            },
          ]
        : [
            {
              title: 'Build & convert',
              operations: ['merge', 'from-image', 'jpeg', 'png'],
            },
            {
              title: 'Organize pages',
              operations: ['extract', 'rotate', 'delete', 'reverse', 'reorder'],
            },
            {
              title: 'Finishing & details',
              operations: [
                'compress',
                'edit',
                'numbers',
                'watermark',
                'metadata',
                'clean',
                'size',
              ],
            },
          ];
    return definitions.map((d) => ({
      title: d.title,
      category,
      items: tools.filter(
        (t) => t.category === category.id && d.operations.includes(t.operation),
      ),
    }));
  }
  if (menu.id === 'passport') {
    const category = categories.find((c) => c.id === 'passport')!;
    return [
      {
        title: 'Passport & ID photos',
        category,
        items: tools.filter(
          (t) =>
            t.category === 'passport' && ['photo', '2x2'].includes(t.operation),
        ),
      },
      {
        title: 'Signatures & print sheets',
        category,
        items: tools.filter(
          (t) =>
            t.category === 'passport' &&
            ['signature', 'sheet'].includes(t.operation),
        ),
      },
    ];
  }
  return menu.categoryIds.map((id) => {
    const category = categories.find((c) => c.id === id)!;
    return {
      title: category.name,
      category,
      items: tools.filter((t) => t.category === id),
    };
  });
}
