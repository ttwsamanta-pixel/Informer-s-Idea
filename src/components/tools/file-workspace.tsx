'use client';
import { useState } from 'react';
import { CropPreview } from './crop-preview';
import type { ToolDefinition } from '@/types/tools';
import {
  defaultImageSettings,
  type ImageSettings,
} from '@/lib/processing/image';
import { defaultPDFSettings, type PDFSettings } from '@/lib/processing/pdf';
import {
  friendlyError,
  validateFiles,
  type Output,
} from '@/lib/processing/files';
import {
  UploadZone,
  FileList,
  BlobImage,
  ErrorMessage,
  ProcessingState,
  Results,
  Field,
  TextResult,
} from './shared';
export default function FileWorkspace({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<File[]>([]);
  const [image, setImage] = useState<ImageSettings>(defaultImageSettings);
  const [pdf, setPdf] = useState<PDFSettings>(defaultPDFSettings);
  const [results, setResults] = useState<Output[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [aspect, setAspect] = useState(1);
  const [locked, setLocked] = useState(true);
  const kind =
    tool.processor === 'pdf' && tool.operation !== 'from-image'
      ? 'pdf'
      : 'image';
  const isImage = tool.processor === 'image';
  const op = tool.operation;
  const update = <K extends keyof ImageSettings>(
    key: K,
    value: ImageSettings[K],
  ) =>
    setImage((prev) => ({
      ...prev,
      [key]: value,
      ...(locked && op === 'resize' && key === 'width'
        ? { height: Math.max(1, Math.round(Number(value) / aspect)) }
        : locked && op === 'resize' && key === 'height'
          ? { width: Math.max(1, Math.round(Number(value) * aspect)) }
          : {}),
    }));
  const updatePdf = <K extends keyof PDFSettings>(
    key: K,
    value: PDFSettings[K],
  ) => setPdf((prev) => ({ ...prev, [key]: value }));
  const choose = async (next: File[]) => {
    setError('');
    setResults([]);
    setText('');
    try {
      const selection =
        isImage || op === 'merge' || op === 'from-image'
          ? [...files, ...next]
          : next;
      await validateFiles(
        selection,
        kind,
        isImage || op === 'merge' || op === 'from-image' ? 20 : 1,
      );
      setFiles(selection);
      if (kind === 'image' && selection[0]) {
        const b = await createImageBitmap(selection[0]);
        setAspect(b.width / b.height);
        setDimensions(`${b.width} × ${b.height} pixels`);
        setImage((s) => ({
          ...s,
          width: b.width,
          height: b.height,
          format:
            selection[0].type === 'image/png'
              ? 'png'
              : selection[0].type === 'image/webp'
                ? 'webp'
                : 'jpeg',
        }));
        b.close();
      }
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  const run = async () => {
    setBusy(true);
    setError('');
    setResults([]);
    setText('');
    setProgress(0);
    try {
      await validateFiles(
        files,
        kind,
        isImage || op === 'merge' || op === 'from-image' ? 20 : 1,
      );
      let output: Output[] = [];
      if (isImage) {
        const { processImage } = await import('@/lib/processing/image');
        for (const [i, file] of files.entries()) {
          output.push(
            await processImage(file, op, image, (n) =>
              setProgress(((i + n / 100) / files.length) * 100),
            ),
          );
          setProgress(((i + 1) / files.length) * 100);
          await new Promise((r) => setTimeout(r, 0));
        }
      } else {
        const { processPDF } = await import('@/lib/processing/pdf');
        output = await processPDF(files, op, pdf, setProgress);
      }
      setResults(output);
      if (output[0]?.blob.type === 'text/plain')
        setText(await output[0].blob.text());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="workspace">
      <div className="workspace-card">
        <h2>1. Choose your {kind === 'pdf' ? 'documents' : 'images'}</h2>
        <UploadZone
          accept={
            kind === 'pdf'
              ? 'application/pdf'
              : 'image/jpeg,image/png,image/webp'
          }
          multiple={isImage || op === 'merge' || op === 'from-image'}
          onFiles={choose}
          disabled={busy}
        />
        <FileList
          files={files}
          disabled={busy}
          onChange={(f) => {
            setFiles(f);
            setResults([]);
            setText('');
          }}
        />
        {kind === 'image' && files[0] && (
          <>
            {op === 'crop' ? (
              <CropPreview
                file={files[0]}
                settings={image}
                onChange={setImage}
              />
            ) : (
              <BlobImage blob={files[0]} alt="Original image preview" />
            )}
            <p className="tool-note">
              Original: {dimensions}
              {op === 'crop'
                ? ' · Crop coordinates are percentages of the original image.'
                : ''}
            </p>
          </>
        )}
        <ErrorMessage message={error} />
        {busy && (
          <ProcessingState
            progress={progress}
            status="Processing locally in your browser…"
          />
        )}
        {text && <TextResult text={text} />}
        <Results
          results={results}
          onClear={() => {
            setResults([]);
            setText('');
          }}
        />
      </div>
      <div className="workspace-card">
        <h2>2. Make it yours</h2>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          {isImage ? (
            <>
              {op === 'resize' && (
                <>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={locked}
                      onChange={(e) => setLocked(e.target.checked)}
                    />
                    Lock aspect ratio
                  </label>
                  <div className="field-row">
                    <Field label="Width (px)">
                      <input
                        type="number"
                        min={1}
                        max={12000}
                        value={image.width}
                        onChange={(e) =>
                          update('width', Number(e.target.value))
                        }
                      />
                    </Field>
                    <Field label="Height (px)">
                      <input
                        type="number"
                        min={1}
                        max={12000}
                        value={image.height}
                        onChange={(e) =>
                          update('height', Number(e.target.value))
                        }
                      />
                    </Field>
                  </div>
                  <p className="tool-note">
                    The image is resized to these exact dimensions. Lock the
                    aspect ratio to preserve proportions.
                  </p>
                </>
              )}
              {op === 'crop' && (
                <>
                  <div className="field-row">
                    <Field label="Left offset (%)">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={image.x}
                        onChange={(e) => update('x', Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Top offset (%)">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={image.y}
                        onChange={(e) => update('y', Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Crop width (%)">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={image.cropWidth}
                        onChange={(e) =>
                          update('cropWidth', Number(e.target.value))
                        }
                      />
                    </Field>
                    <Field label="Crop height (%)">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={image.cropHeight}
                        onChange={(e) =>
                          update('cropHeight', Number(e.target.value))
                        }
                      />
                    </Field>
                  </div>
                  <p className="tool-note">
                    Example: left 25%, top 25%, width 50%, height 50% crops the
                    center quarter.
                  </p>
                </>
              )}
              {op === 'rotate' && (
                <Field label="Rotation">
                  <select
                    value={image.rotation}
                    onChange={(e) => update('rotation', Number(e.target.value))}
                  >
                    <option value={90}>90° clockwise</option>
                    <option value={180}>180°</option>
                    <option value={270}>90° counterclockwise</option>
                  </select>
                </Field>
              )}
              {op === 'flip' && (
                <Field label="Direction">
                  <select
                    value={image.vertical ? 'vertical' : 'horizontal'}
                    onChange={(e) =>
                      update('vertical', e.target.value === 'vertical')
                    }
                  >
                    <option value="horizontal">Horizontal (mirror)</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </Field>
              )}
              {['blur', 'brightness', 'contrast'].includes(op) && (
                <Field
                  label={`Intensity: ${image.amount}${op === 'blur' ? ' / 10 px' : '%'}`}
                >
                  <input
                    type="range"
                    min={op === 'blur' ? 0 : 10}
                    max={op === 'blur' ? 200 : 200}
                    value={image.amount}
                    onChange={(e) => update('amount', Number(e.target.value))}
                  />
                </Field>
              )}
              {op === 'text' && (
                <>
                  <Field label="Text">
                    <input
                      value={image.text}
                      onChange={(e) => update('text', e.target.value)}
                    />
                  </Field>
                  <div className="field-row">
                    <Field label="Text size (px)">
                      <input
                        type="number"
                        min={8}
                        max={500}
                        value={image.fontSize}
                        onChange={(e) =>
                          update('fontSize', Number(e.target.value))
                        }
                      />
                    </Field>
                    <Field label="Text color">
                      <input
                        type="color"
                        value={image.color}
                        onChange={(e) => update('color', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label={`Vertical position: ${image.y || 85}%`}>
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={image.y || 85}
                      onChange={(e) => update('y', Number(e.target.value))}
                    />
                  </Field>
                </>
              )}
              {!tool.format && (
                <Field label="Output format">
                  <select
                    value={image.format}
                    onChange={(e) => update('format', e.target.value)}
                  >
                    <option value="jpeg">JPG — smaller photo files</option>
                    <option value="png">PNG — lossless, transparency</option>
                    <option value="webp">WebP — efficient and modern</option>
                  </select>
                </Field>
              )}
              {(tool.format || image.format) !== 'png' && (
                <Field label={`Quality: ${image.quality}%`}>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={image.quality}
                    onChange={(e) => update('quality', Number(e.target.value))}
                  />
                </Field>
              )}
              {op === 'compress' && (
                <Field
                  label="Target size (KB, optional)"
                  hint="0 keeps quality-based compression. A target is best effort; PNG may not shrink."
                >
                  <input
                    type="number"
                    min={0}
                    max={40000}
                    value={image.targetKB}
                    onChange={(e) => update('targetKB', Number(e.target.value))}
                  />
                </Field>
              )}
              <p className="tool-note">
                Images are re-encoded without original metadata. JPG replaces
                transparency with white. PNG is lossless; its file size can
                increase.
              </p>
            </>
          ) : (
            <>
              {![
                'merge',
                'from-image',
                'metadata',
                'clean',
                'size',
                'reverse',
                'numbers',
                'watermark',
              ].includes(op) && (
                <Field
                  label={
                    op === 'delete'
                      ? 'Pages to remove'
                      : op === 'reorder'
                        ? 'Page order'
                        : 'Pages (blank = all)'
                  }
                  hint="Use 1, 3-5, 7. Reorder example: 3, 1, 2."
                >
                  <input
                    value={pdf.pages}
                    onChange={(e) => updatePdf('pages', e.target.value)}
                    placeholder="e.g. 1, 3-5"
                  />
                </Field>
              )}
              {op === 'rotate' && (
                <Field label="Rotation">
                  <select
                    value={pdf.rotation}
                    onChange={(e) =>
                      updatePdf('rotation', Number(e.target.value))
                    }
                  >
                    <option value={90}>90° clockwise</option>
                    <option value={180}>180°</option>
                    <option value={270}>90° counterclockwise</option>
                  </select>
                </Field>
              )}
              {op === 'watermark' && (
                <Field label="Watermark text">
                  <input
                    value={pdf.text}
                    onChange={(e) => updatePdf('text', e.target.value)}
                  />
                </Field>
              )}
              {['jpeg', 'png'].includes(op) && (
                <Field label="Render resolution">
                  <select
                    value={pdf.scale}
                    onChange={(e) => updatePdf('scale', Number(e.target.value))}
                  >
                    <option value={1}>72 DPI — screen</option>
                    <option value={1.5}>108 DPI — balanced</option>
                    <option value={2}>144 DPI — detailed</option>
                    <option value={3}>216 DPI — high quality</option>
                  </select>
                </Field>
              )}
              {op === 'from-image' && (
                <>
                  <Field label="Page size">
                    <select
                      value={pdf.pageSize}
                      onChange={(e) => updatePdf('pageSize', e.target.value)}
                    >
                      <option value="a4">A4</option>
                      <option value="letter">US Letter</option>
                      <option value="fit">Fit image</option>
                    </select>
                  </Field>
                  <Field label="Orientation">
                    <select
                      value={pdf.orientation}
                      onChange={(e) => updatePdf('orientation', e.target.value)}
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </Field>
                  <Field label="Margin (points)">
                    <input
                      type="number"
                      min={0}
                      max={150}
                      value={pdf.margin}
                      onChange={(e) =>
                        updatePdf('margin', Number(e.target.value))
                      }
                    />
                  </Field>
                </>
              )}
              {['jpeg', 'from-image'].includes(op) && (
                <Field label={`Image quality: ${pdf.quality}%`}>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={pdf.quality}
                    onChange={(e) =>
                      updatePdf('quality', Number(e.target.value))
                    }
                  />
                </Field>
              )}
              <p className="tool-note">
                {op === 'merge'
                  ? 'Files merge from top to bottom. Use the arrows beside each file to reorder.'
                  : op === 'clean'
                    ? 'Clears standard PDF information fields. This is not a full document sanitizer; embedded files or XMP metadata may remain.'
                    : 'Password-protected PDFs are not supported. Large documents may need to be processed in smaller batches.'}
              </p>
            </>
          )}
          <button
            disabled={busy || !files.length}
            className="button primary full-width"
            onClick={run}
          >
            {busy ? 'Processing…' : tool.name}
          </button>
          {files.length > 0 && (
            <button
              className="button secondary full-width"
              style={{ marginTop: 10 }}
              onClick={() => {
                setFiles([]);
                setResults([]);
                setText('');
                setError('');
              }}
            >
              Process another / Clear
            </button>
          )}
        </fieldset>
        <PrivacyTip />
      </div>
    </div>
  );
}
function PrivacyTip() {
  return (
    <p className="tool-note">
      No account. No uploads. Your original files are never changed.
    </p>
  );
}
