import { cleanName, type Output } from './files';

/** Single-threaded, same-origin WASM: no uploads or cross-origin isolation. */
export async function convertVideo(
  file: File,
  input: string,
  output: string,
  progress: (n: number) => void,
  signal?: AbortSignal,
  status?: (text: string) => void,
): Promise<Output[]> {
  signal?.throwIfAborted();
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  signal?.throwIfAborted();
  const engine = new FFmpeg();
  let timedOut = false;
  const stop = () => engine.terminate();
  signal?.addEventListener('abort', stop, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    stop();
  }, 180_000);
  try {
    status?.('Loading video engine (about 32 MB on first use)…');
    const asset = (path: string) =>
      new URL('/workers/' + path, location.origin).href;
    await engine.load({
      classWorkerURL: asset('ffmpeg-wrapper/worker.js'),
      coreURL: asset('ffmpeg/ffmpeg-core.js'),
      wasmURL: asset('ffmpeg/ffmpeg-core.wasm'),
    });
    signal?.throwIfAborted();
    status?.('Checking video…');
    const source = 'input.' + input;
    await engine.writeFile(source, new Uint8Array(await file.arrayBuffer()));
    const probe = await engine.ffprobe([
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=codec_type,width,height,duration',
      '-of',
      'json',
      '-o',
      'probe.json',
      source,
    ]);
    // This core can return -1 after a successful ffprobe; validate its JSON below.
    if (probe !== 0 && probe !== -1)
      throw new Error(
        'This video could not be read. Try another file or codec.',
      );
    const metadata = JSON.parse(
      (await engine.readFile('probe.json', 'utf8')) as string,
    ) as {
      format?: { duration?: string };
      streams?: {
        codec_type: string;
        width?: number;
        height?: number;
        duration?: string;
      }[];
    };
    const video = metadata.streams?.find((s) => s.codec_type === 'video');
    if (!video) throw new Error('No video track found in this file.');
    const duration = Number(metadata.format?.duration || video.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 120)
      throw new Error(
        'Choose a video up to 2 minutes long with readable duration metadata.',
      );
    if (
      !video.width ||
      !video.height ||
      video.width * video.height > 1920 * 1080
    )
      throw new Error(
        'Choose a video no larger than 1920 × 1080 pixels (Full HD).',
      );
    if (
      ['mp3', 'wav'].includes(output) &&
      !metadata.streams?.some((s) => s.codec_type === 'audio')
    )
      throw new Error('This video has no audio track to extract.');
    const seconds = output === 'gif' ? Math.min(duration, 10) : duration;
    engine.on('progress', ({ time }) =>
      progress(Math.min(95, 15 + (time / 1_000_000 / seconds) * 80)),
    );
    const destination = 'output.' + output;
    const args =
      output === 'mp3'
        ? ['-vn', '-c:a', 'libmp3lame', '-b:a', '128k']
        : output === 'wav'
          ? ['-vn', '-c:a', 'pcm_s16le', '-ar', '44100', '-ac', '2']
          : output === 'gif'
            ? [
                '-t',
                '10',
                '-an',
                '-vf',
                'fps=10,scale=480:-1:flags=lanczos',
                '-loop',
                '0',
              ]
            : [
                '-vf',
                "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
                '-r',
                '30',
                '-c:v',
                'libx264',
                '-preset',
                'ultrafast',
                '-crf',
                '25',
                '-pix_fmt',
                'yuv420p',
                '-c:a',
                'aac',
                '-b:a',
                '128k',
                '-movflags',
                '+faststart',
              ];
    status?.(
      output === 'gif'
        ? 'Creating GIF from the first 10 seconds…'
        : 'Converting video… Keep this tab open.',
    );
    const code = await engine.exec([
      '-i',
      source,
      ...args,
      '-threads',
      '1',
      destination,
    ]);
    signal?.throwIfAborted();
    if (code !== 0)
      throw new Error(
        'Video conversion failed. The codec may be unsupported or this device may not have enough memory.',
      );
    const bytes = await engine.readFile(destination);
    if (!(bytes instanceof Uint8Array) || !bytes.length)
      throw new Error('No converted file was produced.');
    if (bytes.length >= 100 * 1024 * 1024)
      throw new Error('Output exceeds 100 MB. Please use a shorter video.');
    progress(100);
    return [
      {
        name: cleanName(file.name) + '.' + output,
        blob: new Blob([new Uint8Array(bytes)], {
          type: {
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            gif: 'image/gif',
            mp4: 'video/mp4',
          }[output],
        }),
      },
    ];
  } catch (error) {
    if (signal?.aborted)
      throw new DOMException('Conversion cancelled.', 'AbortError');
    if (timedOut)
      throw new Error(
        'Video processing exceeded 3 minutes. Try a shorter clip.',
      );
    throw error instanceof Error
      ? error
      : new Error(
          'Unable to process this video. Try a smaller file or a different codec.',
        );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', stop);
    engine.terminate();
  }
}
