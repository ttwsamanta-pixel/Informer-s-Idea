import { getFormat } from '@/config/conversion-formats';
import { cleanName, type Output, MAX_FILE_SIZE } from './files';

function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || cell === '') quoted = !quoted;
      else throw new Error('Invalid quote in delimited data.');
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('A quoted field is not closed.');
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
async function readText(file: Blob) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error('Text and spreadsheet files must be under 5 MB.');
  return new TextDecoder('utf-8', { fatal: true })
    .decode(await file.arrayBuffer())
    .replace(/^\uFEFF/, '');
}
export async function convertFile(
  file: File,
  input: string,
  output: string,
  quality: number,
  progress: (n: number) => void,
  signal?: AbortSignal,
  status?: (text: string) => void,
): Promise<Output[]> {
  signal?.throwIfAborted();
  const format = getFormat(input);
  if (!format?.outputs.includes(output))
    throw new Error('This conversion is not supported.');
  if (!file.size || file.size > MAX_FILE_SIZE)
    throw new Error('Choose a non-empty file under 40 MB.');
  const name = cleanName(file.name);
  const result = (data: BlobPart, mime: string) => [
    { name: `${name}.${output}`, blob: new Blob([data], { type: mime }) },
  ];
  progress(10);
  if (format.category === 'Video') {
    const { convertVideo } = await import('./video-converter');
    return convertVideo(file, input, output, progress, signal, status);
  }
  if (
    input === 'docx' ||
    (input === 'txt' && ['pdf', 'docx'].includes(output))
  ) {
    const { readDocx, textToPDF, textToDocx } =
      await import('./document-converter');
    const text = input === 'docx' ? await readDocx(file) : await readText(file);
    signal?.throwIfAborted();
    status?.('Creating text document...');
    if (output === 'txt') return result(text, 'text/plain;charset=utf-8');
    const blob =
      output === 'pdf' ? await textToPDF(text, signal) : await textToDocx(text);
    return [{ name: `${name}.${output}`, blob }];
  }
  if (input === 'pdf') {
    const { validateFiles } = await import('./files');
    await validateFiles([file], 'pdf');
    const { renderPDF, loadPDF, defaultPDFSettings } = await import('./pdf');
    if (output === 'jpg' || output === 'png')
      return renderPDF(
        file,
        { ...defaultPDFSettings, quality },
        output === 'jpg' ? 'jpeg' : 'png',
        progress,
      );
    const loaded = await loadPDF(file);
    try {
      if (loaded.document.numPages > 100)
        throw new Error('Please use a PDF with up to 100 pages.');
      const pages: string[] = [];
      for (let n = 1; n <= loaded.document.numPages; n++) {
        signal?.throwIfAborted();
        const page = await loaded.document.getPage(n);
        const content = await page.getTextContent();
        pages.push(
          content.items
            .map((item) =>
              'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '',
            )
            .join(''),
        );
        page.cleanup();
        progress((n / loaded.document.numPages) * 100);
      }
      if (!pages.some((p) => p.trim()))
        throw new Error(
          'No selectable text found. Use our OCR tools for scanned PDFs.',
        );
      if (output === 'docx') {
        const { textToDocx } = await import('./document-converter');
        return [
          { name: `${name}.docx`, blob: await textToDocx(pages.join('\n\n')) },
        ];
      }
      return result(pages.join('\n\n'), 'text/plain;charset=utf-8');
    } finally {
      await loaded.destroy();
    }
  }
  if (format.category === 'Images') {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const signature = String.fromCharCode(...bytes);
    const valid =
      input === 'jpg'
        ? bytes[0] === 255 && bytes[1] === 216
        : input === 'png'
          ? bytes[0] === 137 && signature.slice(1, 4) === 'PNG'
          : input === 'webp'
            ? signature.startsWith('RIFF') && signature.endsWith('WEBP')
            : input === 'gif'
              ? /^GIF8[79]a/.test(signature)
              : signature.startsWith('BM');
    if (!valid) throw new Error('Image contents do not match the filename.');
    if (output === 'pdf') {
      const { processPDF, defaultPDFSettings } = await import('./pdf');
      const outputs = await processPDF(
        [file],
        'from-image',
        { ...defaultPDFSettings, pageSize: 'fit', quality },
        progress,
      );
      return outputs.map((o) => ({ ...o, name: `${name}.pdf` }));
    }
    const { processImage, defaultImageSettings } = await import('./image');
    const converted = await processImage(
      file,
      'convert',
      {
        ...defaultImageSettings,
        format: output === 'jpg' ? 'jpeg' : output,
        quality,
      },
      progress,
    );
    if (converted.blob.type !== `image/${output === 'jpg' ? 'jpeg' : output}`)
      throw new Error('Your browser cannot encode this output format.');
    return [{ ...converted, name: `${name}.${output}` }];
  }
  if (format.category === 'Audio') {
    const context = new AudioContext();
    try {
      const audio = await context.decodeAudioData(await file.arrayBuffer());
      const size = audio.length * audio.numberOfChannels * 2;
      if (size > 100 * 1024 * 1024)
        throw new Error(
          'Decoded audio is too large. Please choose a shorter clip.',
        );
      const buffer = new ArrayBuffer(44 + size);
      const view = new DataView(buffer);
      const str = (offset: number, text: string) =>
        [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
      str(0, 'RIFF');
      view.setUint32(4, 36 + size, true);
      str(8, 'WAVE');
      str(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, audio.numberOfChannels, true);
      view.setUint32(24, audio.sampleRate, true);
      view.setUint32(28, audio.sampleRate * audio.numberOfChannels * 2, true);
      view.setUint16(32, audio.numberOfChannels * 2, true);
      view.setUint16(34, 16, true);
      str(36, 'data');
      view.setUint32(40, size, true);
      const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
        audio.getChannelData(i),
      );
      let offset = 44;
      for (let i = 0; i < audio.length; i++)
        for (const channel of channels) {
          const sample = Math.max(-1, Math.min(1, channel[i]));
          view.setInt16(
            offset,
            sample < 0 ? sample * 32768 : sample * 32767,
            true,
          );
          offset += 2;
        }
      return result(buffer, 'audio/wav');
    } finally {
      await context.close();
    }
  }
  if (input === 'gz') {
    const reader = file
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
      .getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 5 * 1024 * 1024)
          throw new Error('Decompressed text exceeds the 5 MB limit.');
        parts.push(new Uint8Array(chunk.value));
      }
    } finally {
      await reader.cancel();
    }
    return result(await readText(new Blob(parts)), 'text/plain;charset=utf-8');
  }
  const text = await readText(file);
  if (output === 'gz')
    return [
      {
        name: `${file.name}.gz`,
        blob: await new Response(
          new Blob([text]).stream().pipeThrough(new CompressionStream('gzip')),
        ).blob(),
      },
    ];
  if (format.category === 'Spreadsheets') {
    let rows: string[][];
    if (input === 'json') {
      const data: unknown = JSON.parse(text);
      if (!Array.isArray(data) || !data.length)
        throw new Error('Use a non-empty JSON array of objects or rows.');
      const scalar = (v: unknown) => {
        if (v !== null && typeof v === 'object')
          throw new Error('Nested JSON values are not supported.');
        return v == null ? '' : String(v);
      };
      if (data.every(Array.isArray)) rows = data.map((row) => row.map(scalar));
      else if (
        data.every(
          (row) => row && typeof row === 'object' && !Array.isArray(row),
        )
      ) {
        const keys = [...new Set(data.flatMap(Object.keys))];
        rows = [keys, ...data.map((row) => keys.map((k) => scalar(row[k])))];
      } else throw new Error('Use consistent JSON objects or arrays for rows.');
    } else rows = parseRows(text, input === 'csv' ? ',' : '\t');
    if (output === 'json')
      return result(JSON.stringify(rows, null, 2), 'application/json');
    const delimiter = output === 'csv' ? ',' : '\t';
    return result(
      rows
        .map((row) =>
          row
            .map((cell) =>
              /["\r\n,\t]/.test(cell)
                ? '"' + cell.replaceAll('"', '""') + '"'
                : cell,
            )
            .join(delimiter),
        )
        .join('\r\n'),
      output === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'text/tab-separated-values;charset=utf-8',
    );
  }
  if (output === 'html')
    return result(
      '<!doctype html><html><head><meta charset="utf-8"><title>Converted text</title></head><body><pre>' +
        text
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;') +
        '</pre></body></html>',
      'text/html;charset=utf-8',
    );
  if (input === 'html') {
    // An inert template does not execute scripts or fetch embedded resources.
    const template = document.createElement('template');
    template.innerHTML = text;
    template.content
      .querySelectorAll('script,style,template')
      .forEach((el) => el.remove());
    template.content
      .querySelectorAll('br,p,div,h1,h2,h3,li,tr')
      .forEach((el) => el.append('\n'));
    return result(
      template.content.textContent || '',
      'text/plain;charset=utf-8',
    );
  }
  return result(text, 'text/plain;charset=utf-8');
}
