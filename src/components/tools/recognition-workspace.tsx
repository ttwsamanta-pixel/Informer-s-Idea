'use client';
import { useState } from 'react';
import type { ToolDefinition } from '@/types/tools';
import {
  validateFiles,
  friendlyError,
  cleanName,
  type Output,
} from '@/lib/processing/files';
import {
  UploadZone,
  FileList,
  BlobImage,
  Field,
  ErrorMessage,
  ProcessingState,
  Results,
  TextResult,
} from './shared';
export default function RecognitionWorkspace({
  tool,
}: {
  tool: ToolDefinition;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState('eng');
  const [text, setText] = useState('');
  const [results, setResults] = useState<Output[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const isPDF = tool.operation === 'pdf';
  const background = tool.processor === 'background';
  const scanner = tool.processor === 'scanner';
  const choose = async (f: File[]) => {
    setError('');
    setText('');
    setResults([]);
    try {
      await validateFiles(f, isPDF ? 'pdf' : 'image', 1);
      setFiles(f);
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  const run = async () => {
    setBusy(true);
    setError('');
    setText('');
    setResults([]);
    setProgress(0);
    try {
      if (!files[0]) throw new Error('Choose a file first.');
      if (background) {
        setStatus('Downloading the AI model, then processing on your device…');
        const { removeBackground } = await import('@imgly/background-removal');
        const blob = await removeBackground(files[0], {
          model: 'isnet_quint8',
          device: 'cpu',
          progress: (key, current, total) => {
            setStatus(
              key.startsWith('fetch')
                ? 'Downloading model assets…'
                : 'Removing background locally…',
            );
            setProgress(total ? (current / total) * 100 : 0);
          },
        });
        setResults([
          { blob, name: cleanName(files[0].name) + '-no-background.png' },
        ]);
      } else if (scanner) {
        setStatus('Reading QR code…');
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const reader = new BrowserQRCodeReader();
        const url = URL.createObjectURL(files[0]);
        try {
          const result = await reader.decodeFromImageUrl(url);
          setText(result.getText());
        } catch {
          throw new Error(
            'No readable QR code was found. Try a sharper image showing the complete code.',
          );
        } finally {
          URL.revokeObjectURL(url);
        }
      } else {
        setStatus('Loading OCR engine and language data…');
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker(language, 1, {
          logger: (m) => {
            setStatus(
              m.status === 'recognizing text'
                ? 'Recognizing text on your device…'
                : m.status,
            );
            setProgress(m.progress * 100);
          },
        });
        try {
          if (isPDF) {
            const { renderPDF, defaultPDFSettings, loadPDF } =
              await import('@/lib/processing/pdf');
            const loaded = await loadPDF(files[0]);
            const pageCount = loaded.document.numPages;
            await loaded.destroy();
            if (pageCount > 30)
              throw new Error(
                'For OCR, use a PDF with up to 30 pages. Split larger documents first.',
              );
            const images = await renderPDF(
              files[0],
              { ...defaultPDFSettings, scale: 2 },
              'png',
              setProgress,
            );
            if (images.length > 30)
              throw new Error(
                'For OCR, use a PDF with up to 30 pages. Split larger documents first.',
              );
            const pages: string[] = [];
            for (const [i, img] of images.entries()) {
              setStatus(`Recognizing page ${i + 1} of ${images.length}…`);
              const result = await worker.recognize(img.blob);
              pages.push(`--- Page ${i + 1} ---\n${result.data.text}`);
            }
            setText(pages.join('\n\n'));
          } else {
            const result = await worker.recognize(files[0]);
            setText(
              result.data.text ||
                'No text was detected. Try a sharper image with larger text.',
            );
          }
        } finally {
          await worker.terminate();
        }
      }
    } catch (e) {
      setError(
        background
          ? 'The local AI model could not run. Check your connection for the initial model download, then try again in a recent Chrome or Edge browser.'
          : friendlyError(e),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="workspace">
      <div className="workspace-card">
        <h2>1. Choose your {isPDF ? 'document' : 'image'}</h2>
        <UploadZone
          accept={isPDF ? 'application/pdf' : 'image/jpeg,image/png,image/webp'}
          onFiles={choose}
          disabled={busy}
        />
        <FileList
          files={files}
          disabled={busy}
          onChange={(f) => {
            setFiles(f);
            setText('');
            setResults([]);
          }}
        />
        {files[0] && !isPDF && (
          <BlobImage blob={files[0]} alt="Selected image" />
        )}
        <ErrorMessage message={error} />
        {busy && <ProcessingState progress={progress} status={status} />}
        <Results results={results} onClear={() => setResults([])} />
        {text && (
          <div style={{ marginTop: 20 }}>
            <h2>{scanner ? 'Decoded content' : 'Extracted text'}</h2>
            <TextResult text={text} name={tool.slug + '.txt'} />
          </div>
        )}
      </div>
      <div className="workspace-card">
        <h2>
          {background
            ? 'On-device AI'
            : scanner
              ? 'Read your QR code'
              : '2. Recognition settings'}
        </h2>
        {!background && !scanner && (
          <Field label="Text language">
            <select
              disabled={busy}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="eng">English</option>
              <option value="hin">Hindi</option>
              <option value="ben">Bengali</option>
              <option value="spa">Spanish</option>
              <option value="fra">French</option>
              <option value="deu">German</option>
              <option value="por">Portuguese</option>
              <option value="ara">Arabic</option>
            </select>
          </Field>
        )}
        <p className="tool-note">
          {background
            ? 'The first run downloads an AI model (about 40 MB, plus runtime files). Inference runs locally; your image is never uploaded. Initial processing can take a minute or more.'
            : scanner
              ? 'Choose an image containing a complete QR code. Decoded links are shown as text so you can inspect them before opening.'
              : 'The OCR engine downloads language data on first use. Text recognition happens on your device. Accuracy depends on image clarity; review the result before use.'}
        </p>
        <button
          className="button primary full-width"
          disabled={busy || !files.length}
          onClick={run}
        >
          {busy ? 'Processing…' : tool.name}
        </button>
        {files.length > 0 && (
          <button
            disabled={busy}
            className="button secondary full-width"
            style={{ marginTop: 10 }}
            onClick={() => {
              setFiles([]);
              setText('');
              setResults([]);
              setError('');
            }}
          >
            Clear / Process another
          </button>
        )}
      </div>
    </div>
  );
}
