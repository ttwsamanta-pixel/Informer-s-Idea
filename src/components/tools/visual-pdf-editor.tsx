'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import {
  MousePointer2,
  Type,
  ImagePlus,
  PenLine,
  Highlighter,
  Square,
  Circle,
  Link2,
  Eraser,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Move,
  Check,
  FileText,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BlobImage, ErrorMessage, Field, UploadZone } from './shared';
import { download, validateFiles } from '@/lib/processing/files';

type Kind =
  | 'text'
  | 'image'
  | 'rectangle'
  | 'ellipse'
  | 'highlight'
  | 'whiteout'
  | 'link';
type Item = {
  id: string;
  page: number;
  kind: Kind;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceId?: string;
  originalRect?: number[];
  text?: string;
  size?: number;
  font?: string;
  color?: string;
  data?: string;
  url?: string;
  removed?: boolean;
};
type PageData = {
  width: number;
  height: number;
  items: Item[];
  words: Item[];
  png: Uint8Array;
  count: number;
};
type Reply = PageData & {
  output: Uint8Array;
  error?: string;
  id: number;
  ready?: boolean;
};
const toolbar = [
  ['select', 'Select / edit', MousePointer2],
  ['text', 'Text', Type],
  ['image', 'Image', ImagePlus],
  ['signature', 'Sign', PenLine],
  ['whiteout', 'Whiteout', Eraser],
  ['highlight', 'Highlight', Highlighter],
  ['rectangle', 'Rectangle', Square],
  ['ellipse', 'Ellipse', Circle],
  ['link', 'Link', Link2],
] as const;
const fonts = [
  'Helvetica',
  'Helvetica-Bold',
  'Times-Roman',
  'Times-Bold',
  'Courier',
  'Courier-Bold',
];

export default function VisualPDFEditor() {
  const worker = useRef<Worker | null>(null);
  const workerReady = useRef(false);
  const queue = useRef<Record<string, unknown>[]>([]);
  const pending = useRef(
    new Map<
      number,
      { resolve: (r: Reply) => void; reject: (e: Error) => void }
    >(),
  );
  const sequence = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(0);
  const [info, setInfo] = useState<PageData | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [history, setHistory] = useState<Item[][]>([[]]);
  const [cursor, setCursor] = useState(0);
  const [draft, setDraft] = useState<Item | null>(null);
  const [mode, setMode] = useState<string>('select');
  const [textSelection, setTextSelection] = useState<'words' | 'lines'>(
    'words',
  );
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [sign, setSign] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const signature = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    changed: boolean;
  } | null>(null);
  const edits = history[cursor];
  const call = useCallback(
    (message: Record<string, unknown>) =>
      new Promise<Reply>((resolve, reject) => {
        if (!worker.current) {
          worker.current = new Worker('/pdf-editor.worker.js', {
            type: 'module',
          });
          worker.current.onmessage = ({ data }: MessageEvent<Reply>) => {
            if (data.ready) {
              workerReady.current = true;
              queue.current.forEach((message) =>
                worker.current?.postMessage(message),
              );
              queue.current = [];
              return;
            }
            const request = pending.current.get(data.id);
            pending.current.delete(data.id);
            if (data.error) request?.reject(new Error(data.error));
            else request?.resolve(data);
          };
          worker.current.onerror = () => {
            for (const request of pending.current.values())
              request.reject(
                new Error(
                  'The PDF engine could not start. Refresh and try again.',
                ),
              );
            pending.current.clear();
            worker.current?.terminate();
            worker.current = null;
            workerReady.current = false;
            queue.current = [];
          };
        }
        const id = ++sequence.current;
        pending.current.set(id, { resolve, reject });
        if (workerReady.current) worker.current.postMessage({ ...message, id });
        else queue.current.push({ ...message, id });
      }),
    [],
  );
  useEffect(
    () => () => {
      worker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    if (!file) return;
    let current = true;
    async function render() {
      setRendering(true);
      try {
        const result = await call({ action: 'render', page, edits });
        if (current) {
          setInfo(result);
          setPreview(
            new Blob([new Uint8Array(result.png)], { type: 'image/png' }),
          );
          setError('');
        }
      } catch (e) {
        if (current) setError((e as Error).message);
      } finally {
        if (current) setRendering(false);
      }
    }
    void render();
    return () => {
      current = false;
    };
  }, [file, page, edits, call]);

  const commit = (item: Item) => {
    const next = [...edits.filter((e) => e.id !== item.id), item];
    const steps = [...history.slice(0, cursor + 1), next].slice(-41);
    setHistory(steps);
    setCursor(steps.length - 1);
    setDraft(null);
    setStatus('Change applied. You can undo it or download your PDF.');
  };
  const choose = async (files: File[]) => {
    setBusy(true);
    setError('');
    try {
      await validateFiles(files, 'pdf', 1);
      const next = files[0];
      const result = await call({
        action: 'open',
        bytes: await next.arrayBuffer(),
        page: 0,
      });
      setFile(next);
      setInfo(result);
      setPreview(new Blob([new Uint8Array(result.png)], { type: 'image/png' }));
      setPage(0);
      setHistory([[]]);
      setCursor(0);
      setDraft(null);
      setMode('select');
      setStatus('Select detected text or an image to edit it.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const add = (kind: Kind, x = 36, y = 36, data?: string) => {
    if (!info) return;
    const width = Math.min(kind === 'text' ? 240 : 140, info.width - x);
    setDraft({
      id: crypto.randomUUID(),
      page,
      kind,
      x,
      y,
      width,
      height: Math.min(
        kind === 'text' ? 60 : kind === 'highlight' ? 25 : 90,
        info.height - y,
      ),
      text: kind === 'text' ? 'Your text here' : '',
      font: 'Helvetica',
      size: 16,
      color: kind === 'highlight' ? '#ffdc45' : '#5140ff',
      url: 'https://',
      data,
    });
    setMode('select');
  };
  const chooseImage = async (next: File | undefined, asSignature = false) => {
    if (!next) return;
    setError('');
    try {
      await validateFiles([next], 'image', 1);
      if (next.size > 8 * 1024 * 1024)
        throw new Error('Choose an image smaller than 8 MB.');
      const bitmap = await createImageBitmap(next);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      bitmap.close();
      const data = canvas.toDataURL('image/png');
      if (asSignature) {
        const width = Math.min(200, (info?.width || 300) - 72);
        const height = Math.min(
          (width * canvas.height) / canvas.width,
          (info?.height || 400) - 72,
        );
        setDraft({
          id: crypto.randomUUID(),
          page,
          kind: 'image',
          x: 36,
          y: 36,
          width: (height * canvas.width) / canvas.height,
          height,
          data,
        });
        setMode('select');
        setSign(false);
        setStatus(
          'Signature uploaded. Drag it into position and select Apply object.',
        );
      } else if (draft?.kind === 'image') setDraft({ ...draft, data });
      else add('image', 36, 36, data);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const applyDraft = () => {
    if (!draft || !info) return;
    if (
      ![draft.x, draft.y, draft.width, draft.height].every(Number.isFinite) ||
      draft.x < 0 ||
      draft.y < 0 ||
      draft.width < 3 ||
      draft.height < 3 ||
      draft.x + draft.width > info.width + 0.1 ||
      draft.y + draft.height > info.height + 0.1
    ) {
      setError(
        'Keep the object inside the page with a positive width and height.',
      );
      return;
    }
    if (
      draft.kind === 'text' &&
      (!draft.text?.trim() || !draft.size || draft.size < 6 || draft.size > 144)
    ) {
      setError('Enter text and use a font size from 6 to 144.');
      return;
    }
    if (
      draft.kind === 'link' &&
      !/^https?:\/\/[^\s]+$/i.test(draft.url || '')
    ) {
      setError('Enter a complete link beginning with https:// or http://.');
      return;
    }
    setError('');
    commit(draft);
  };
  const point = (event: PointerEvent) => {
    const box = stage.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * info!.width,
      y: ((event.clientY - box.top) / box.height) * info!.height,
    };
  };
  const startDrag = (event: PointerEvent<HTMLButtonElement>, item: Item) => {
    event.stopPropagation();
    if (busy || rendering) return;
    const p = point(event);
    setDraft({ ...item });
    setMode('select');
    drag.current = {
      startX: p.x,
      startY: p.y,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      changed: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || !info) return;
    const p = point(event),
      previous = drag.current;
    if (Math.abs(p.x - previous.startX) + Math.abs(p.y - previous.startY) < 2)
      return;
    previous.changed = true;
    setDraft((current) =>
      current
        ? {
            ...current,
            x: Math.max(
              0,
              Math.min(
                info.width - previous.width,
                previous.x + p.x - previous.startX,
              ),
            ),
            y: Math.max(
              0,
              Math.min(
                info.height - previous.height,
                previous.y + p.y - previous.startY,
              ),
            ),
          }
        : null,
    );
  };
  const save = async () => {
    if (!file) return;
    if (draft) {
      setError('Apply or cancel the selected object before downloading.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await call({ action: 'export', edits });
      download(
        new Blob([new Uint8Array(result.output)], {
          type: 'application/pdf',
        }),
        file.name.replace(/\.pdf$/i, '') + '-edited.pdf',
      );
      setStatus('Your edited PDF has been downloaded.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const sourceItems = info
    ? textSelection === 'words'
      ? [...info.items.filter((item) => item.kind !== 'text'), ...info.words]
      : info.items
    : [];
  const items = info
    ? [
        ...sourceItems.filter(
          (item) =>
            !edits.some(
              (e) =>
                e.id === item.id ||
                (e.page === item.page &&
                  e.kind === item.kind &&
                  e.originalRect &&
                  Math.min(item.x + item.width, e.originalRect[2]) -
                    Math.max(item.x, e.originalRect[0]) >
                    0.1 &&
                  Math.min(item.y + item.height, e.originalRect[3]) -
                    Math.max(item.y, e.originalRect[1]) >
                    0.1),
            ),
        ),
        ...edits.filter((e) => e.page === page && !e.removed),
      ]
    : [];
  const selectedItems = draft
    ? [...items.filter((e) => e.id !== draft.id), draft]
    : items;
  return (
    <div className="visual-pdf-editor">
      <div className="editor-heading">
        <div>
          <span className="eyebrow">YOUR DOCUMENT. YOUR WAY.</span>
          <h2>A complete canvas for your ideas</h2>
          <p>
            Edit text, replace images, sign and annotate — right on the page.
          </p>
        </div>
        <span className="editor-private">
          <ShieldCheck size={16} /> Files stay on your device
        </span>
      </div>
      {!file ? (
        <div className="editor-welcome">
          <FileText size={46} />
          <h3>Start with your PDF</h3>
          <p>
            Click a word, line or image to change it. Add something new anywhere.
          </p>
          <UploadZone
            accept="application/pdf"
            onFiles={choose}
            disabled={busy}
          />
          <p className="tool-note">
            Up to 40 MB / 150 pages. Scanned text is part of an image, not an
            editable text layer.
          </p>
          {busy && <p role="status">Opening your document…</p>}
          <ErrorMessage message={error} />
        </div>
      ) : (
        <>
          <div className="editor-filebar">
            <span>
              <FileText size={17} /> {file.name}
            </span>
            <label className="editor-open">
              Open another PDF
              <input
                type="file"
                accept="application/pdf"
                disabled={busy || rendering || edits.length > 0 || !!draft}
                onChange={(e) =>
                  e.target.files?.[0] && void choose([e.target.files[0]])
                }
              />
            </label>
            <button
              className="button primary"
              disabled={busy || rendering}
              onClick={save}
            >
              <Download size={16} />
              {busy ? 'Saving…' : 'Download PDF'}
            </button>
          </div>
          <div
            className="editor-toolbar"
            role="toolbar"
            aria-label="PDF editing tools"
          >
            {toolbar.map(([id, label, Icon]) => (
              <button
                key={id}
                className={mode === id ? 'active' : ''}
                aria-pressed={mode === id}
                disabled={busy || rendering}
                onClick={() => {
                  setError('');
                  if (id === 'image') {
                    setDraft(null);
                    imageInput.current?.click();
                  } else if (id === 'signature') setSign(true);
                  else {
                    setDraft(null);
                    setMode(id);
                  }
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
            <span className="toolbar-divider" />
            <button
              disabled={cursor === 0 || busy || rendering}
              onClick={() => {
                setCursor(cursor - 1);
                setDraft(null);
              }}
            >
              <Undo2 size={17} />
              Undo
            </button>
            <button
              disabled={cursor === history.length - 1 || busy || rendering}
              onClick={() => {
                setCursor(cursor + 1);
                setDraft(null);
              }}
            >
              <Redo2 size={17} />
              Redo
            </button>
          </div>
          <input
            ref={imageInput}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Choose editor image"
            onChange={(e) => {
              void chooseImage(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <ErrorMessage message={error} />
          <div className="editor-body">
            <aside className="editor-pages" aria-label="PDF pages">
              <h3>
                Pages <span>{info?.count}</span>
              </h3>
              {Array.from({ length: info?.count || 0 }, (_, i) => (
                <button
                  className={i === page ? 'active' : ''}
                  key={i}
                  disabled={busy || rendering}
                  aria-label={`Go to page ${i + 1}`}
                  aria-current={i === page ? 'page' : undefined}
                  onClick={() => {
                    setDraft(null);
                    setPage(i);
                  }}
                >
                  <FileText size={28} />
                  <span>{i + 1}</span>
                  {edits.some((e) => e.page === i) && (
                    <i aria-label="Edited page" />
                  )}
                </button>
              ))}
            </aside>
            <div className="editor-canvas-area">
              <div className="editor-viewbar">
                <label className="editor-selection">
                  Select text
                  <select
                    aria-label="Text selection"
                    value={textSelection}
                    onChange={(e) => {
                      setDraft(null);
                      setTextSelection(e.target.value as 'words' | 'lines');
                    }}
                  >
                    <option value="words">Individual words</option>
                    <option value="lines">Whole lines</option>
                  </select>
                </label>
                <span>
                  Page {page + 1} of {info?.count}
                </span>
                <div>
                  <button
                    aria-label="Zoom out"
                    disabled={zoom <= 50}
                    onClick={() => setZoom(Math.max(50, zoom - 25))}
                  >
                    <ZoomOut size={17} />
                  </button>
                  <button onClick={() => setZoom(100)}>{zoom}%</button>
                  <button
                    aria-label="Zoom in"
                    disabled={zoom >= 200}
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                  >
                    <ZoomIn size={17} />
                  </button>
                </div>
              </div>
              <p className="editor-instruction" role="status">
                {rendering
                  ? 'Rendering your changes…'
                  : mode === 'select'
                    ? 'Click text or an image to edit. Drag an object to move it.'
                    : `Click anywhere on the page to add ${mode}.`}
              </p>
              <div className="editor-scroll">
                <div
                  className="editor-paper"
                  ref={stage}
                  style={{
                    width: `${zoom}%`,
                    aspectRatio: info
                      ? `${info.width}/${info.height}`
                      : '0.707',
                    pointerEvents: rendering || busy ? 'none' : undefined,
                  }}
                  onPointerDown={(e) => {
                    if (mode !== 'select' && info) {
                      const p = point(e);
                      add(
                        mode as Kind,
                        Math.min(p.x, info.width - 40),
                        Math.min(p.y, info.height - 40),
                      );
                    } else setDraft(null);
                  }}
                >
                  {preview && (
                    <BlobImage
                      blob={preview}
                      alt={`PDF page ${page + 1}`}
                      className="editor-page-image"
                    />
                  )}
                  {mode === 'select' &&
                    selectedItems.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={
                          'editor-object ' +
                          (draft?.id === item.id ? 'selected' : '')
                        }
                        aria-label={`${item.sourceId ? 'Edit existing' : 'Edit added'} ${item.kind}${item.text ? ': ' + item.text : ''}`}
                        style={{
                          left: `${(item.x / info!.width) * 100}%`,
                          top: `${(item.y / info!.height) * 100}%`,
                          width: `${(item.width / info!.width) * 100}%`,
                          height: `${(item.height / info!.height) * 100}%`,
                        }}
                        onPointerDown={(e) => {
                          // This runs only on a pointer event; canvas refs are never read during render.
                          // eslint-disable-next-line react-hooks/refs
                          startDrag(e, item);
                        }}
                        onPointerMove={moveDrag}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          if (drag.current?.changed && draft) commit(draft);
                          drag.current = null;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDraft({ ...item });
                          }
                        }}
                      >
                        {draft?.id === item.id && (
                          <span className="object-handle">
                            <Move size={12} />
                            {item.kind}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
              <p className="editor-status" role="status">
                {status}
              </p>
            </div>
            <aside className="editor-properties">
              <h3>
                {draft
                  ? `${draft.sourceId ? 'Edit' : 'Add'} ${draft.kind}`
                  : 'Make it yours'}
              </h3>
              {!draft ? (
                <>
                  <MousePointer2 size={32} />
                  <p>Select an object on the page to see its controls.</p>
                  <div className="editor-tip">
                    <strong>A few helpful details</strong>
                    <p>
                      Choose individual words or whole lines. Resize the box for
                      longer text; paragraphs do not automatically reflow.
                    </p>
                    <p>
                      Replacement text uses the selected font. Embedded fonts
                      and complex scripts may look different.
                    </p>
                    <p>
                      Whiteout only covers content. Replacing or deleting
                      detected text and images removes the original page
                      content.
                    </p>
                  </div>
                  {edits.length > 0 && (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setHistory([[]]);
                        setCursor(0);
                        setDraft(null);
                        setStatus(
                          'All edits cleared. Original document restored.',
                        );
                      }}
                      disabled={busy || rendering}
                    >
                      Reset all edits
                    </button>
                  )}
                </>
              ) : (
                <fieldset disabled={busy || rendering}>
                  {draft.kind === 'text' && (
                    <>
                      <Field label="Text content">
                        <textarea
                          rows={5}
                          value={draft.text}
                          onChange={(e) =>
                            setDraft({ ...draft, text: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Font">
                        <select
                          value={draft.font}
                          onChange={(e) =>
                            setDraft({ ...draft, font: e.target.value })
                          }
                        >
                          {fonts.map((font) => (
                            <option key={font}>{font}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Font size">
                        <input
                          type="number"
                          min={6}
                          max={144}
                          value={draft.size}
                          onChange={(e) =>
                            setDraft({ ...draft, size: Number(e.target.value) })
                          }
                        />
                      </Field>
                    </>
                  )}
                  {draft.kind === 'image' && (
                    <button
                      className="button secondary full-width"
                      onClick={() => imageInput.current?.click()}
                    >
                      <ImagePlus size={16} />
                      Replace image
                    </button>
                  )}
                  {draft.kind === 'link' && (
                    <Field label="Link URL">
                      <input
                        value={draft.url}
                        onChange={(e) =>
                          setDraft({ ...draft, url: e.target.value })
                        }
                      />
                    </Field>
                  )}
                  {!['image', 'link', 'whiteout'].includes(draft.kind) && (
                    <Field label="Color">
                      <input
                        type="color"
                        value={draft.color}
                        onChange={(e) =>
                          setDraft({ ...draft, color: e.target.value })
                        }
                      />
                    </Field>
                  )}
                  <div className="field-row">
                    {(['x', 'y', 'width', 'height'] as const).map((key) => (
                      <Field
                        key={key}
                        label={
                          {
                            x: 'Left (pt)',
                            y: 'Top (pt)',
                            width: 'Width (pt)',
                            height: 'Height (pt)',
                          }[key]
                        }
                      >
                        <input
                          type="number"
                          step={1}
                          value={Math.round(draft[key] * 10) / 10}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              [key]: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  <button
                    className="button primary full-width"
                    onClick={applyDraft}
                  >
                    <Check size={16} />
                    Apply object
                  </button>
                  <button
                    className="button secondary full-width"
                    onClick={() => setDraft(null)}
                  >
                    Cancel selection
                  </button>
                  {(draft.sourceId || edits.some((e) => e.id === draft.id)) && (
                    <button
                      className="editor-delete"
                      onClick={() => commit({ ...draft, removed: true })}
                    >
                      <Trash2 size={16} />
                      Delete object
                    </button>
                  )}
                </fieldset>
              )}
            </aside>
          </div>
          <p className="tool-note">
            Edits stay in this tab until downloaded. Export flattens
            annotations; digital signatures become invalid after editing. Review
            the result before sharing.
          </p>
        </>
      )}
      {sign && (
        <div
          className="editor-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Draw or upload your signature"
        >
          <div>
            <button
              className="icon-button"
              aria-label="Close signature"
              onClick={() => setSign(false)}
            >
              <X size={18} />
            </button>
            <h3>Your signature</h3>
            <ErrorMessage message={error} />
            <label className="button secondary signature-upload">
              {' '}
              <ImagePlus size={16} />
              Upload signature
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload signature image"
                onChange={(e) => {
                  void chooseImage(e.target.files?.[0], true);
                  e.target.value = '';
                }}
              />
            </label>
            <p className="tool-note">
              PNG, JPG or WebP, up to 8 MB. A transparent PNG blends best with
              your page.
            </p>
            <p>Draw with your mouse or finger.</p>
            <canvas
              ref={signature}
              width={600}
              height={220}
              aria-label="Signature drawing area"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const r = e.currentTarget.getBoundingClientRect();
                const c = e.currentTarget.getContext('2d')!;
                c.beginPath();
                c.moveTo(
                  ((e.clientX - r.left) * 600) / r.width,
                  ((e.clientY - r.top) * 220) / r.height,
                );
              }}
              onPointerMove={(e) => {
                if (!e.buttons) return;
                const r = e.currentTarget.getBoundingClientRect();
                const c = e.currentTarget.getContext('2d')!;
                c.strokeStyle = '#15234c';
                c.lineWidth = 3;
                c.lineCap = 'round';
                c.lineTo(
                  ((e.clientX - r.left) * 600) / r.width,
                  ((e.clientY - r.top) * 220) / r.height,
                );
                c.stroke();
              }}
            />
            <div className="field-row">
              <button
                className="button secondary"
                onClick={() =>
                  signature.current?.getContext('2d')?.clearRect(0, 0, 600, 220)
                }
              >
                Clear signature
              </button>
              <button
                className="button primary"
                onClick={() => {
                  if (signature.current) {
                    add('image', 36, 36, signature.current.toDataURL());
                    setSign(false);
                  }
                }}
              >
                Use signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
