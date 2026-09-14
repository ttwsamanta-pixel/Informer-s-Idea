'use client';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { readList, writePreference } from '@/hooks/use-preferences';
import type { ToolDefinition } from '@/types/tools';
const loading = () => (
  <div className="empty-state" role="status">
    Opening your workspace…
  </div>
);
const FileWorkspace = dynamic(() => import('./file-workspace'), {
  ssr: false,
  loading,
});
const PassportWorkspace = dynamic(() => import('./passport-workspace'), {
  ssr: false,
  loading,
});
const QRWorkspace = dynamic(() => import('./qr-workspace'), {
  ssr: false,
  loading,
});
const UtilityWorkspace = dynamic(() => import('./utility-workspace'), {
  ssr: false,
  loading,
});
const RecognitionWorkspace = dynamic(() => import('./recognition-workspace'), {
  ssr: false,
  loading,
});
const SignatureWorkspace = dynamic(() => import('./signature-workspace'), {
  ssr: false,
  loading,
});
export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  useEffect(() => {
    const previous: string[] = readList('recent');
    writePreference(
      'recent',
      JSON.stringify(
        [tool.slug, ...previous.filter((s) => s !== tool.slug)].slice(0, 8),
      ),
    );
  }, [tool.slug]);
  switch (tool.component) {
    case 'image':
    case 'pdf':
      return <FileWorkspace tool={tool} />;
    case 'passport':
      return <PassportWorkspace tool={tool} />;
    case 'qr':
      return <QRWorkspace tool={tool} />;
    case 'utility':
      return <UtilityWorkspace tool={tool} />;
    case 'signature':
      return <SignatureWorkspace />;
    default:
      return <RecognitionWorkspace tool={tool} />;
  }
}
