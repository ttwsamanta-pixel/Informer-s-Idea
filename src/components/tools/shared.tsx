'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  ShieldCheck,
  X,
  ArrowUp,
  ArrowDown,
  Download,
  CheckCircle,
  Copy,
} from 'lucide-react';
import {
  bundle,
  download,
  fileSize,
  type Output,
} from '@/lib/processing/files';
export function PrivacyNotice() {
  return (
    <p className="privacy-notice">
      <ShieldCheck size={14} />
      Your files stay on your device. Always.
    </p>
  );
}
export function UploadZone({
  accept,
  multiple = false,
  onFiles,
  disabled = false,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <>
      <button
        disabled={disabled}
        type="button"
        className={'upload-zone full-width ' + (drag ? 'dragging' : '')}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled) onFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <Upload size={35} />
        <strong>
          Drop your {accept.includes('pdf') ? 'PDFs' : 'images'} here
        </strong>
        <span className="button primary">
          Choose {multiple ? 'files' : 'a file'}
        </span>
        <small>
          {accept.includes('pdf') ? 'PDF' : 'JPG, PNG, WebP'} · Up to 40 MB per
          file{multiple ? ' · 20 files max' : ''}
        </small>
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />
      <PrivacyNotice />
    </>
  );
}
export function BlobImage({
  blob,
  alt,
  className = 'file-preview',
}: {
  blob: Blob;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const value = URL.createObjectURL(blob); // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return url ? <img className={className} src={url} alt={alt} /> : null;
}
export function FileList({
  files,
  onChange,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="file-list">
      {files.map((f, i) => (
        <div className="file-item" key={f.name + '-' + i}>
          {f.type.startsWith('image/') && (
            <BlobImage blob={f} alt="Selected file" className="file-thumb" />
          )}
          <div>
            <strong>{f.name}</strong>
            <small>{fileSize(f.size)} · Ready</small>
          </div>
          <div className="file-controls">
            {files.length > 1 && (
              <>
                <button
                  disabled={disabled || i === 0}
                  className="icon-button"
                  aria-label={'Move up ' + f.name}
                  onClick={() => {
                    const a = [...files];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    onChange(a);
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  disabled={disabled || i === files.length - 1}
                  className="icon-button"
                  aria-label={'Move down ' + f.name}
                  onClick={() => {
                    const a = [...files];
                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                    onChange(a);
                  }}
                >
                  <ArrowDown size={14} />
                </button>
              </>
            )}
            <button
              disabled={disabled}
              className="icon-button"
              aria-label={'Remove ' + f.name}
              onClick={() => onChange(files.filter((_, n) => n !== i))}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error-message">
      {message}
    </div>
  ) : null;
}
export function ProcessingState({
  progress,
  status,
}: {
  progress: number;
  status: string;
}) {
  return (
    <div className="processing" role="status">
      <span>{status}</span>
      <progress max={100} value={progress > 0 ? progress : undefined} />
      {progress > 0 && <small>{Math.round(progress)}%</small>}
    </div>
  );
}
export function Results({
  results,
  onClear,
}: {
  results: Output[];
  onClear: () => void;
}) {
  const [error, setError] = useState('');
  const [zipping, setZipping] = useState(false);
  return results.length ? (
    <div className="result-card">
      <h3>
        <CheckCircle size={20} />
        All done. Ready to download.
      </h3>
      {results.map((r, i) => (
        <div key={i}>
          {r.blob.type.startsWith('image/') && (
            <BlobImage blob={r.blob} alt={'Result: ' + r.name} />
          )}
          <p>
            <strong>{r.name}</strong>
            <br />
            {r.detail} · {fileSize(r.blob.size)}
            {r.originalSize
              ? ` · Original: ${fileSize(r.originalSize)} · ${r.blob.size < r.originalSize ? Math.round((1 - r.blob.size / r.originalSize) * 100) + '% smaller' : 'Output is not smaller; try a lower quality or different format.'}`
              : ''}
          </p>
          <button
            className="button primary"
            onClick={() => download(r.blob, r.name)}
          >
            <Download size={16} />
            Download{results.length > 1 ? ' ' + (i + 1) : ''}
          </button>
        </div>
      ))}
      <div className="result-actions">
        {results.length > 1 && (
          <button
            disabled={zipping}
            className="button secondary"
            onClick={async () => {
              setZipping(true);
              try {
                download(await bundle(results), 'informers-idea-results.zip');
              } catch {
                setError(
                  'Could not create the ZIP. Download files individually or try fewer files.',
                );
              } finally {
                setZipping(false);
              }
            }}
          >
            {zipping ? 'Creating ZIP…' : 'Download all as ZIP'}
          </button>
        )}
        <button className="button secondary" onClick={onClear}>
          Clear results
        </button>
      </div>
      <ErrorMessage message={error} />
    </div>
  ) : null;
}
export function TextResult({
  text,
  name = 'result.txt',
}: {
  text: string;
  name?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <textarea aria-label="Output text" value={text} readOnly rows={10} />
      <div className="result-actions">
        <button
          className="button primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setError(
                'Clipboard access is unavailable. Select the output text and copy it manually.',
              );
            }
          }}
        >
          <Copy size={15} />
          {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button
          className="button secondary"
          onClick={() =>
            download(
              new Blob([text], { type: 'text/plain;charset=utf-8' }),
              name,
            )
          }
        >
          <Download size={15} />
          Download TXT
        </button>
      </div>
      <ErrorMessage message={error} />
    </>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
