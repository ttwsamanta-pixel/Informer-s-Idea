import {
  Image,
  FileText,
  ScanFace,
  Sparkles,
  QrCode,
  ArrowRightLeft,
  ScanText,
  LayoutGrid,
} from 'lucide-react';
const icons = {
  image: Image,
  pdf: FileText,
  passport: ScanFace,
  ai: Sparkles,
  qr: QrCode,
  convert: ArrowRightLeft,
  ocr: ScanText,
  utility: LayoutGrid,
};
export function ToolIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] || LayoutGrid;
  return <Icon size={size} strokeWidth={1.8} />;
}
