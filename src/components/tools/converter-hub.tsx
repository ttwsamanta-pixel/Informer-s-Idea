'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeftRight,
  ChevronDown,
  File,
  Upload,
  ShieldCheck,
  Download,
  X,
  Search,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  conversionFormats,
  formatCategories,
  detectFormat,
  getFormat,
  type FormatCategory,
} from '@/config/conversion-formats';
import {
  bundle,
  download,
  fileSize,
  friendlyError,
  type Output,
} from '@/lib/processing/files';

function FormatPicker({
  value,
  choices,
  label,
  onChange,
}: {
  value: string;
  choices: string[];
  label: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className="convert-picker"
      ref={ref}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget))
          e.currentTarget.open = false;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          ref.current!.open = false;
          ref.current?.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label={label}>
        <small>{label}</small>
        <span>
          <File size={22} />
          {value ? value.toUpperCase() : 'Choose format'}
          <ChevronDown size={16} />
        </span>
      </summary>
      <div className="convert-picker-popover">
        <label className="convert-search">
          <Search size={17} />
          <input
            aria-label={'Search ' + label}
            placeholder="Search formats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="convert-picker-results">
          {formatCategories.map((category) => {
            const items = conversionFormats.filter(
              (f) =>
                f.category === category &&
                choices.includes(f.id) &&
                (f.id + ' ' + category)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            );
            return items.length ? (
              <section key={category}>
                <strong>{category}</strong>
                <div>
                  {items.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => {
                        onChange(f.id);
                        ref.current!.open = false;
                        setQuery('');
                      }}
                    >
                      {f.id.toUpperCase()}
                    </button>
                  ))}
                </div>
              </section>
            ) : null;
          })}
          {!choices.some((id) =>
            (id + ' ' + getFormat(id)?.category)
              .toLowerCase()
              .includes(query.toLowerCase()),
          ) && <p>No matching formats.</p>}
        </div>
      </div>
    </details>
  );
}
interface QueueItem {
  id: number;
  file: File;
  input: string;
  target: string;
  status: 'ready' | 'working' | 'done' | 'error';
  progress: number;
  error?: string;
  outputs?: Output[];
  message?: string;
}
export default function ConverterHub() {
  return (
    <Suspense
      fallback={
        <section className="container section" role="status" aria-live="polite">
          <h1>File converter</h1>
          <p>Loading your conversion options...</p>
        </section>
      }
    >
      <ConverterRoute />
    </Suspense>
  );
}
function ConverterRoute() {
  const params = useSearchParams();
  const input = getFormat(params.get('from') || '');
  const from = input?.outputs.length ? input.id : '';
  const to = input?.outputs.includes(params.get('to') || '')
    ? params.get('to')!
    : '';
  const requested = params.get('category') as FormatCategory;
  const category = formatCategories.includes(requested)
    ? requested
    : input?.category || 'Images';
  return (
    <ConverterWorkspace
      key={`${from}:${to}:${category}`}
      initialSource={from}
      initialTarget={to}
      initialCategory={category}
    />
  );
}
function ConverterWorkspace({
  initialSource = '',
  initialTarget = '',
  initialCategory = 'Images',
}: {
  initialSource?: string;
  initialTarget?: string;
  initialCategory?: FormatCategory;
}) {
  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState(initialTarget);
  const [category, setCategory] = useState<FormatCategory>(initialCategory);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const busyRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const inputs = conversionFormats
    .filter((f) => f.outputs.length)
    .map((f) => f.id);
  const outputs = source
    ? getFormat(source)!.outputs
    : [...new Set(conversionFormats.flatMap((f) => f.outputs))];
  const chooseSource = (id: string) => {
    setSource(id);
    if (!getFormat(id)?.outputs.includes(target)) setTarget('');
  };
  const chooseTarget = (id: string) => {
    setTarget(id);
    setItems((rows) =>
      rows.map((row) =>
        row.status !== 'done' && getFormat(row.input)?.outputs.includes(id)
          ? { ...row, target: id, status: 'ready', error: undefined }
          : row,
      ),
    );
  };
  async function addFiles(files: File[]) {
    if (busyRef.current) return;
    setError('');
    if (
      items.length + files.length > 20 ||
      [...items.map((i) => i.file), ...files].reduce((n, f) => n + f.size, 0) >
        100 * 1024 * 1024
    ) {
      setError('Choose up to 20 files, with a combined size under 100 MB.');
      return;
    }
    const added = files.map((file) => {
      const detected = detectFormat(file.name);
      const valid =
        detected?.outputs.length &&
        file.size > 0 &&
        file.size <= 40 * 1024 * 1024;
      return {
        id: ++nextId.current,
        file,
        input: detected?.id || '',
        target: detected?.outputs.includes(target) ? target : '',
        status: valid ? ('ready' as const) : ('error' as const),
        progress: 0,
        error: !valid
          ? !file.size
            ? 'This file is empty.'
            : file.size > 40 * 1024 * 1024
              ? 'This file exceeds 40 MB.'
              : 'This input format is not supported yet. Choose a format listed in the catalogue.'
          : undefined,
      };
    });
    setItems((rows) => [...rows, ...added]);
    if (
      !items.length &&
      added[0]?.input &&
      getFormat(added[0].input)?.outputs.length
    ) {
      setSource(added[0].input);
      if (!getFormat(added[0].input)?.outputs.includes(target)) setTarget('');
    }
  }
  const patch = (id: number, change: Partial<QueueItem>) =>
    setItems((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...change } : row)),
    );
  async function convert() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const job = new AbortController();
    controller.current = job;
    try {
      const { convertFile } = await import('@/lib/processing/file-converter');
      for (const row of items.filter(
        (row) =>
          row.status !== 'done' &&
          row.target &&
          getFormat(row.input)?.outputs.includes(row.target),
      )) {
        if (job.signal.aborted) break;
        patch(row.id, {
          status: 'working',
          progress: 0,
          error: undefined,
          message: 'Converting... Keep this tab open.',
        });
        try {
          const results = await convertFile(
            row.file,
            row.input,
            row.target,
            90,
            (progress) => patch(row.id, { progress }),
            job.signal,
            (message) => patch(row.id, { message }),
          );
          job.signal.throwIfAborted();
          patch(row.id, { status: 'done', progress: 100, outputs: results });
        } catch (e) {
          patch(row.id, {
            status: 'error',
            error: job.signal.aborted
              ? 'Conversion cancelled. You can try again.'
              : friendlyError(e),
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      controller.current = null;
      busyRef.current = false;
      setBusy(false);
    }
  }
  const allResults = items.flatMap((row) => row.outputs || []);
  async function downloadResults(results: Output[]) {
    try {
      if (results.length === 1) download(results[0].blob, results[0].name);
      else download(await bundle(results), 'converted-files.zip');
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  return (
    <>
      <section className="convert-hero">
        <div className="container convert-hero-grid">
          <div>
            <span className="eyebrow">ONE WORKSPACE. MORE POSSIBILITIES.</span>
            <h1>
              Your files.
              <br />
              <em>A new format.</em>
            </h1>
            <p>
              Choose a file and discover what it can become. Convert locally,
              keep control of your files, and get back to your day.
            </p>
            <span className="convert-private">
              <ShieldCheck size={17} /> No uploads · No account · Free to use
            </span>
          </div>
          <fieldset className="convert-route" disabled={busy}>
            <legend className="sr-only">Choose a conversion</legend>
            <FormatPicker
              label="Convert from"
              value={source}
              choices={inputs}
              onChange={chooseSource}
            />
            <ArrowRight className="convert-arrow" size={26} />
            <FormatPicker
              label="Convert to"
              value={target}
              choices={outputs}
              onChange={chooseTarget}
            />
            <p>
              Pick formats first, or choose files to detect their types
              automatically.
            </p>
          </fieldset>
        </div>
      </section>
      {source && getFormat(source)?.note && (
        <p className="container convert-limit-note" role="note">
          {getFormat(source)!.note}
        </p>
      )}
      <section
        className="container convert-workspace"
        aria-label="File converter"
      >
        <input
          ref={picker}
          type="file"
          multiple
          className="sr-only"
          aria-label="Choose files to convert"
          disabled={busy}
          onChange={(e) => {
            void addFiles(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
        <div
          className={'convert-drop ' + (drag ? 'is-dragging' : '')}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <span className="convert-upload-icon">
            <Upload size={30} />
          </span>
          <h2>
            {items.length
              ? 'Add more files to your batch'
              : 'Choose your files to convert'}
          </h2>
          <p>Drag and drop here, or browse your device.</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            <Upload size={17} />
            Select files
          </button>
          <small>40 MB per file · 20 files per batch · 100 MB total</small>
        </div>
        {error && (
          <p role="alert" className="convert-error">
            {error}
          </p>
        )}
        {!!items.length && (
          <div className="convert-queue">
            {items.map((row) => (
              <article className="convert-file" key={row.id}>
                <div className="convert-file-name">
                  <File size={25} />
                  <div>
                    <strong>{row.file.name}</strong>
                    <small>
                      {fileSize(row.file.size)} ·{' '}
                      {row.input.toUpperCase() || 'Unknown format'}
                    </small>
                  </div>
                </div>
                <div className="convert-file-controls">
                  <ArrowRight size={18} />
                  <label>
                    <span className="sr-only">Output for {row.file.name}</span>
                    <select
                      aria-label={'Output for ' + row.file.name}
                      disabled={
                        busy ||
                        row.status === 'done' ||
                        !getFormat(row.input)?.outputs.length
                      }
                      value={row.target}
                      onChange={(e) =>
                        patch(row.id, {
                          target: e.target.value,
                          status: 'ready',
                          error: undefined,
                        })
                      }
                    >
                      <option value="">Select format</option>
                      {formatCategories.map((cat) => {
                        const available = (
                          getFormat(row.input)?.outputs || []
                        ).filter((id) => getFormat(id)?.category === cat);
                        return available.length ? (
                          <optgroup label={cat} key={cat}>
                            {available.map((id) => (
                              <option key={id} value={id}>
                                {id.toUpperCase()}
                              </option>
                            ))}
                          </optgroup>
                        ) : null;
                      })}
                    </select>
                  </label>
                  {row.status === 'done' && (
                    <button
                      className="button secondary"
                      onClick={() => void downloadResults(row.outputs!)}
                    >
                      <Download size={16} />
                      Download{row.outputs!.length > 1 ? ' ZIP' : ''}
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={'Remove ' + row.file.name}
                    disabled={busy}
                    onClick={() =>
                      setItems((rows) => rows.filter((i) => i.id !== row.id))
                    }
                  >
                    <X size={17} />
                  </button>
                </div>
                {getFormat(row.input)?.note && (
                  <p className="convert-file-note">
                    {getFormat(row.input)!.note}
                  </p>
                )}
                {row.status === 'working' && (
                  <div className="convert-progress" role="status">
                    <progress value={row.progress} max={100} />
                    {row.message || 'Converting... Keep this tab open.'}
                  </div>
                )}
                {row.status === 'done' && (
                  <p className="convert-success">
                    <CheckCircle2 size={16} />
                    Ready to download
                  </p>
                )}
                {row.error && (
                  <p role="alert" className="convert-error">
                    {row.error}
                  </p>
                )}
              </article>
            ))}
            <div className="convert-actions">
              <span>Choose an output for each file you want to convert.</span>
              {busy && (
                <button
                  className="button secondary"
                  onClick={() => controller.current?.abort()}
                >
                  Cancel conversion
                </button>
              )}
              {!!allResults.length && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void downloadResults(allResults)}
                >
                  <Download size={17} />
                  Download all
                </button>
              )}
              <button
                className="button primary"
                disabled={
                  busy ||
                  !items.some(
                    (row) =>
                      row.target &&
                      row.status !== 'done' &&
                      getFormat(row.input)?.outputs.includes(row.target),
                  )
                }
                onClick={() => void convert()}
              >
                <ArrowLeftRight size={18} />
                {busy ? 'Converting…' : 'Convert files'}
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="container section convert-catalog">
        <div>
          <span className="eyebrow">FIND YOUR FORMAT</span>
          <h2>Explore the format catalogue</h2>
          <p>
            Browse supported formats and see the outputs available for each.
            Other categories are listed so you can see what is—and
            isn’t—available in this browser-only workspace.
          </p>
        </div>
        <label className="convert-search">
          <Search size={18} />
          <input
            aria-label="Search format catalogue"
            placeholder="Find a format, like PDF or JPG"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div
          className="convert-tabs"
          role="tablist"
          aria-label="Format categories"
        >
          {formatCategories.map((cat) => (
            <button
              role="tab"
              aria-selected={category === cat}
              aria-controls="format-catalog-panel"
              id={'tab-' + cat.replaceAll(' ', '-')}
              key={cat}
              onClick={() => {
                setCategory(cat);
                setQuery('');
              }}
            >
              <Layers size={15} />
              {cat}
              <small>
                {conversionFormats.filter((f) => f.category === cat).length ||
                  '—'}
              </small>
            </button>
          ))}
        </div>
        <div
          className="convert-catalog-panel"
          role="tabpanel"
          id="format-catalog-panel"
          aria-labelledby={'tab-' + category.replaceAll(' ', '-')}
        >
          <h3>{query ? 'Matching formats' : category + ' formats'}</h3>
          <div className="convert-format-grid">
            {conversionFormats
              .filter((f) =>
                query
                  ? (f.id + ' ' + f.extensions.join(' ')).includes(
                      query.toLowerCase(),
                    )
                  : f.category === category,
              )
              .map((f) => (
                <button
                  key={f.id}
                  disabled={!f.outputs.length || busy}
                  onClick={() => {
                    chooseSource(f.id);
                    setTarget('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <strong>{f.id.toUpperCase()}</strong>
                  <span>
                    {f.outputs.length
                      ? 'To ' +
                        f.outputs.map((id) => id.toUpperCase()).join(', ')
                      : 'Output format only'}
                  </span>
                </button>
              ))}
          </div>
          {!conversionFormats.some((f) =>
            query
              ? (f.id + ' ' + f.extensions.join(' ')).includes(
                  query.toLowerCase(),
                )
              : f.category === category,
          ) && (
            <p className="convert-unavailable">
              {query
                ? 'No supported format matches your search.'
                : `${category} conversion is not available in this browser-only workspace yet. No files are uploaded to a server.`}
            </p>
          )}
        </div>
        <div className="convert-benefits">
          <article>
            <ShieldCheck size={26} />
            <h3>Your files stay with you</h3>
            <p>
              Processing happens on your device. Closing this page clears the
              selected files and results.
            </p>
          </article>
          <article>
            <ArrowLeftRight size={26} />
            <h3>Only compatible choices</h3>
            <p>
              Every file gets its own output list. PDF text extraction needs
              selectable text; use <Link href="/ocr-tools">OCR tools</Link> for
              scans.
            </p>
          </article>
          <article>
            <Download size={26} />
            <h3>Ready for your next step</h3>
            <p>
              Download files individually or together as a ZIP. Large files and
              audio may need more memory and time.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
