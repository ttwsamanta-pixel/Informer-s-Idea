import type { CategoryId } from '@/config/categories';
export type Processor =
  | 'image'
  | 'pdf'
  | 'passport'
  | 'ocr'
  | 'qr'
  | 'scanner'
  | 'utility'
  | 'background'
  | 'signature';
export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: CategoryId;
  icon: string;
  acceptedFormats: string[];
  maxFiles: number;
  browserOnly: true;
  keywords: string[];
  relatedTools: string[];
  processor: Processor;
  component: Processor;
  seoTitle: string;
  seoDescription: string;
  popular: boolean;
  featured: boolean;
  operation: string;
  format?: string;
}
