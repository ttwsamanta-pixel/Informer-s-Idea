'use client';
import { useEffect, useRef, useState } from 'react';
import type { ToolDefinition } from '@/types/tools';
import {
  defaultPassportSettings,
  type PassportSettings,
  createPassport,
} from '@/lib/processing/passport';
import {
  validateFiles,
  friendlyError,
  type Output,
} from '@/lib/processing/files';
import {
  UploadZone,
  FileList,
  ErrorMessage,
  Results,
  Field,
  ProcessingState,
} from './shared';
export default function PassportWorkspace({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<PassportSettings>({
    ...defaultPassportSettings,
    ...(tool.operation === '2x2'
      ? { width: 50.8, height: 50.8 }
      : tool.operation === 'signature'
        ? { width: 50, height: 20 }
        : {}),
  });
  const [results, setResults] = useState<Output[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(tool.operation === 'sheet');
  const preview = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    const render = async () => {
      if (!files[0] || !preview.current) return;
      try {
        const b = await createImageBitmap(files[0]);
        if (disposed) {
          b.close();
          return;
        }
        const c = preview.current;
        c.width = 320;
        c.height = Math.max(
          1,
          Math.round((320 * settings.height) / settings.width),
        );
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = settings.background;
        ctx.fillRect(0, 0, c.width, c.height);
        const scale =
          Math.max(c.width / b.width, c.height / b.height) * settings.zoom;
        ctx.drawImage(
          b,
          ((c.width - b.width * scale) * settings.x) / 100,
          ((c.height - b.height * scale) * settings.y) / 100,
          b.width * scale,
          b.height * scale,
        );
        b.close();
      } catch {
        setError(
          'Could not preview this image. Please select a different file.',
        );
      }
    };
    void render();
    return () => {
      disposed = true;
    };
  }, [files, settings]);
  const update = <K extends keyof PassportSettings>(
    k: K,
    v: PassportSettings[K],
  ) => setSettings((s) => ({ ...s, [k]: v }));
  const choose = async (f: File[]) => {
    setError('');
    setResults([]);
    try {
      await validateFiles(f, 'image', 1);
      setFiles(f);
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  return (
    <div className="workspace">
      <div className="workspace-card">
        <h2>1. Choose and position your photo</h2>
        <UploadZone
          accept="image/jpeg,image/png,image/webp"
          onFiles={choose}
          disabled={busy}
        />
        <FileList
          files={files}
          disabled={busy}
          onChange={(f) => {
            setFiles(f);
            setResults([]);
          }}
        />
        {files[0] && (
          <>
            <canvas
              ref={preview}
              className="file-preview"
              style={{ width: 'auto', maxHeight: 360 }}
              aria-label="Live passport crop preview"
            />
            <p className="tool-note">
              Live crop preview. Use zoom and position controls to frame your
              face.
            </p>
          </>
        )}
        <ErrorMessage message={error} />
        {busy && <ProcessingState progress={0} status="Creating your photo…" />}
        <Results results={results} onClear={() => setResults([])} />
      </div>
      <div className="workspace-card">
        <h2>2. Photo dimensions</h2>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="field-row">
            <Field label="Width (mm)">
              <input
                type="number"
                min={1}
                max={200}
                step={0.1}
                value={settings.width}
                onChange={(e) => update('width', Number(e.target.value))}
              />
            </Field>
            <Field label="Height (mm)">
              <input
                type="number"
                min={1}
                max={280}
                step={0.1}
                value={settings.height}
                onChange={(e) => update('height', Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Print resolution">
            <select
              value={settings.dpi}
              onChange={(e) => update('dpi', Number(e.target.value))}
            >
              <option value={150}>150 DPI</option>
              <option value={300}>300 DPI — recommended</option>
              <option value={600}>600 DPI</option>
            </select>
          </Field>
          <Field label={`Zoom: ${settings.zoom.toFixed(2)}×`}>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={settings.zoom}
              onChange={(e) => update('zoom', Number(e.target.value))}
            />
          </Field>
          <Field label="Horizontal position">
            <input
              type="range"
              min={0}
              max={100}
              value={settings.x}
              onChange={(e) => update('x', Number(e.target.value))}
            />
          </Field>
          <Field label="Vertical position">
            <input
              type="range"
              min={0}
              max={100}
              value={settings.y}
              onChange={(e) => update('y', Number(e.target.value))}
            />
          </Field>
          <div className="field-row">
            <Field label="Output format">
              <select
                value={settings.format}
                onChange={(e) => update('format', e.target.value)}
              >
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
              </select>
            </Field>
            <Field label="Background fill">
              <input
                type="color"
                value={settings.background}
                onChange={(e) => update('background', e.target.value)}
              />
            </Field>
          </div>
          <p className="tool-note">
            Background fill applies only to transparent pixels. To replace an
            existing background, use Remove Background first.
          </p>
          <label className="check-field">
            <input
              type="checkbox"
              checked={sheet}
              onChange={(e) => setSheet(e.target.checked)}
            />
            Also create an A4 print sheet
          </label>
          {sheet && (
            <Field
              label="Number of copies"
              hint="Limited to the number that fits on A4 with margins."
            >
              <input
                type="number"
                min={1}
                max={100}
                value={settings.copies}
                onChange={(e) =>
                  update(
                    'copies',
                    Math.max(1, Math.min(100, Number(e.target.value))),
                  )
                }
              />
            </Field>
          )}
          <button
            className="button primary full-width"
            disabled={busy || !files.length}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                setResults(await createPassport(files[0], settings, sheet));
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? 'Creating…'
              : 'Create photo' + (sheet ? ' & print sheet' : '')}
          </button>
          <p className="tool-note">
            Check your application’s official requirements. This tool sizes and
            crops photos; it does not guarantee acceptance. Print sheets at 100%
            / actual size.
          </p>
        </fieldset>
      </div>
    </div>
  );
}
