'use client';
import { useState } from 'react';

export async function uploadImage(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch('/api/v1/admin/media', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.message || 'Image upload failed.');
  return result.data.url;
}
export function ImageUpload({
  name,
  initial = '',
}: {
  name: string;
  initial?: string;
}) {
  const [value, setValue] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="admin-image-upload" data-uploading={busy}>
      <input name={name} type="hidden" value={value} />
      {value && (
        <img
          src={value}
          alt="Selected image preview"
          style={{ maxWidth: 220, maxHeight: 120, objectFit: 'contain' }}
        />
      )}
      <input
        aria-label="Upload image"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError('');
          try {
            setValue(await uploadImage(file));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
            e.target.value = '';
          }
        }}
      />
      {busy && <p role="status">Uploading image… Wait before saving.</p>}
      {error && <p role="alert">{error}</p>}
      {value && (
        <button type="button" onClick={() => setValue('')}>
          Remove image
        </button>
      )}
      <small>
        PNG, JPG, WebP, GIF or AVIF · up to 5 MB. Images are optimized for the
        web.
      </small>
    </div>
  );
}
