'use client';
import { useEffect, useRef, useState } from 'react';
import type { ImageSettings } from '@/lib/processing/image';
export function CropPreview({
  file,
  settings,
  onChange,
}: {
  file: File;
  settings: ImageSettings;
  onChange: (s: ImageSettings) => void;
}) {
  const [url, setUrl] = useState('');
  const [ratio, setRatio] = useState(1);
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    queueMicrotask(() => setUrl(u));
    let active = true;
    createImageBitmap(file)
      .then((b) => {
        if (active) setRatio(b.width / b.height);
        b.close();
      })
      .catch(() => {});
    return () => {
      active = false;
      URL.revokeObjectURL(u);
    };
  }, [file]);
  const position = (x: number, y: number) =>
    onChange({
      ...settings,
      x:
        Math.round(Math.max(0, Math.min(100 - settings.cropWidth, x)) * 10) /
        10,
      y:
        Math.round(Math.max(0, Math.min(100 - settings.cropHeight, y)) * 10) /
        10,
    });
  return (
    <div
      ref={area}
      className="interactive-crop"
      style={{ width: `min(100%, ${Math.min(500, 330 * ratio)}px)` }}
    >
      {url && (
        <img
          src={url}
          alt="Image with draggable crop selection"
          draggable={false}
        />
      )}
      <button
        type="button"
        className="crop-selection"
        aria-label="Move crop selection with arrow keys or drag"
        style={{
          left: settings.x + '%',
          top: settings.y + '%',
          width: settings.cropWidth + '%',
          height: settings.cropHeight + '%',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: settings.x,
            top: settings.y,
          };
        }}
        onPointerMove={(e) => {
          if (!drag.current || !area.current) return;
          const r = area.current.getBoundingClientRect();
          position(
            drag.current.left + ((e.clientX - drag.current.x) / r.width) * 100,
            drag.current.top + ((e.clientY - drag.current.y) / r.height) * 100,
          );
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
          ) {
            e.preventDefault();
            position(
              settings.x +
                (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0),
              settings.y +
                (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0),
            );
          }
        }}
      >
        <span>Drag to position</span>
      </button>
    </div>
  );
}
