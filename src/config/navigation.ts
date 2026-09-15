import { categories, type CategoryId } from './categories';
import { tools } from './tools';
import type { ToolDefinition } from '@/types/tools';
export const navigationMenus = [
  {
    id: 'image',
    label: 'Image Tools',
    categoryIds: ['image'],
    href: '/image-tools',
    description: 'Every image, just the way you need it.',
  },
  {
    id: 'pdf',
    label: 'PDF Tools',
    categoryIds: ['pdf'],
    href: '/pdf-tools',
    description: 'Bring your documents together. Get more done.',
  },
  {
    id: 'passport',
    label: 'Passport',
    categoryIds: ['passport'],
    href: '/passport-tools',
    description: 'Photo sizes, signatures and print-ready sheets.',
  },
  {
    id: 'more',
    label: 'More Tools',
    categoryIds: ['qr', 'ocr', 'converter', 'utility', 'ai'],
    href: '/all-tools',
    description: 'Little helpers for your next big idea.',
  },
  {
    id: 'all',
    label: 'All Tools',
    categoryIds: categories.map((c) => c.id),
    href: '/all-tools',
    description: 'Your entire toolkit. One convenient place.',
  },
] satisfies {
  id: string;
  label: string;
  categoryIds: CategoryId[];
  href: string;
  description: string;
}[];
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
