'use client';
import { useEffect, useRef, useState } from 'react';
import { loadPDF } from '@/lib/processing/pdf';

export function PDFPreview({ blob }: { blob: Blob }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [rendered, setRendered] = useState<{ blob: Blob; page: number } | null>(
    null,
  );
  useEffect(() => {
    let stopped = false;
    let cleanup: (() => Promise<void>) | undefined;
    async function render() {
      try {
        const loaded = await loadPDF(
          new File([blob], 'preview.pdf', { type: 'application/pdf' }),
        );
        cleanup = loaded.destroy;
        if (stopped) {
          await loaded.destroy();
          return;
        }
        setCount(loaded.document.numPages);
        const pdfPage = await loaded.document.getPage(
          Math.min(page, loaded.document.numPages),
        );
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({
          scale: Math.min(1.5, 900 / original.width),
        });
        // Render offscreen so changing documents never shares an active render canvas.
        const target = document.createElement('canvas');
        target.width = viewport.width;
        target.height = viewport.height;
        await pdfPage.render({
          canvas: target,
          canvasContext: target.getContext('2d')!,
          viewport,
        }).promise;
        if (!stopped && canvas.current) {
          canvas.current.width = target.width;
          canvas.current.height = target.height;
          canvas.current.getContext('2d')!.drawImage(target, 0, 0);
          setRendered({ blob, page });
          setError('');
        }
      } catch {
        if (!stopped)
          setError(
            'Preview unavailable. You can still download and open the PDF.',
          );
      } finally {
        await cleanup?.();
      }
    }
    void render();
    return () => {
      stopped = true;
    };
  }, [blob, page]);
  return (
    <div style={{ marginTop: 20 }}>
      <h3>PDF preview</h3>
      {error && <p role="status">{error}</p>}
      {(rendered?.blob !== blob || rendered?.page !== page) && !error && (
        <p role="status">Loading page preview…</p>
      )}
      <canvas
        ref={canvas}
        data-page={rendered?.blob === blob ? rendered.page : undefined}
        aria-label={`PDF page ${Math.min(page, count || 1)} preview`}
        style={{
          width: '100%',
          height: 'auto',
          border: '1px solid #dce3f0',
          borderRadius: 8,
          visibility:
            rendered?.blob === blob && rendered?.page === page
              ? 'visible'
              : 'hidden',
        }}
      />
      <div
        className="field-row"
        style={{ alignItems: 'center', marginTop: 10 }}
      >
        <button
          type="button"
          className="button secondary"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous page
        </button>
        <span>
          {Math.min(page, count || 1)} / {count || '…'}
        </span>
        <button
          type="button"
          className="button secondary"
          disabled={page >= count}
          onClick={() => setPage(page + 1)}
        >
          Next page
        </button>
      </div>
    </div>
  );
}
