'use client';
import { useRef, useState } from 'react';
import { canvasBlob, download } from '@/lib/processing/files';
import { Field, PrivacyNotice, ErrorMessage } from './shared';
export default function SignatureWorkspace() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState('#17213c');
  const [width, setWidth] = useState(3);
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="workspace">
      <div className="workspace-card">
        <h2>Draw your signature</h2>
        <canvas
          ref={canvas}
          width={1000}
          height={400}
          className="signature-canvas"
          aria-label="Signature drawing area. Draw using your mouse or touch."
          onPointerDown={(e) => {
            const c = canvas.current!;
            c.setPointerCapture(e.pointerId);
            const r = c.getBoundingClientRect();
            const ctx = c.getContext('2d')!;
            ctx.beginPath();
            ctx.moveTo(
              ((e.clientX - r.left) * c.width) / r.width,
              ((e.clientY - r.top) * c.height) / r.height,
            );
            ctx.strokeStyle = color;
            ctx.lineWidth = (width * c.width) / r.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            drawing.current = true;
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const c = canvas.current!;
            const r = c.getBoundingClientRect();
            const ctx = c.getContext('2d')!;
            ctx.lineTo(
              ((e.clientX - r.left) * c.width) / r.width,
              ((e.clientY - r.top) * c.height) / r.height,
            );
            ctx.stroke();
            setHasInk(true);
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
        />
        <p className="tool-note">
          Use your mouse, finger, or stylus. The downloaded PNG has a
          transparent background.
        </p>
        <PrivacyNotice />
        <ErrorMessage message={error} />
      </div>
      <div className="workspace-card">
        <h2>Pen settings</h2>
        <Field label="Ink color">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </Field>
        <Field label={`Pen thickness: ${width}px`}>
          <input
            type="range"
            min={1}
            max={10}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </Field>
        <div className="result-actions">
          <button
            className="button primary"
            disabled={!hasInk}
            onClick={async () => {
              try {
                download(await canvasBlob(canvas.current!), 'signature.png');
              } catch {
                setError('Could not export the signature. Please try again.');
              }
            }}
          >
            Download PNG
          </button>
          <button
            className="button secondary"
            onClick={() => {
              canvas.current!.getContext('2d')!.clearRect(0, 0, 1000, 400);
              setHasInk(false);
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
