import { canvasBlob, makeCanvas, cleanName, type Output } from './files';
export interface ImageSettings {
  width: number;
  height: number;
  quality: number;
  format: string;
  rotation: number;
  vertical: boolean;
  x: number;
  y: number;
  cropWidth: number;
  cropHeight: number;
  amount: number;
  text: string;
  color: string;
  fontSize: number;
  targetKB: number;
}
export const defaultImageSettings: ImageSettings = {
  width: 1200,
  height: 800,
  quality: 82,
  format: 'jpeg',
  rotation: 90,
  vertical: false,
  x: 0,
  y: 0,
  cropWidth: 100,
  cropHeight: 100,
  amount: 100,
  text: 'Informer’s Idea',
  color: '#ffffff',
  fontSize: 36,
  targetKB: 0,
};
export async function processImage(
  file: File,
  operation: string,
  s: ImageSettings,
  onProgress: (n: number) => void = () => {},
): Promise<Output> {
  const bitmap = await createImageBitmap(file);
  try {
    let w = bitmap.width,
      h = bitmap.height;
    let sx = 0,
      sy = 0,
      sw = w,
      sh = h;
    if (operation === 'resize') {
      w = s.width;
      h = s.height;
    }
    if (operation === 'crop') {
      sx = (bitmap.width * s.x) / 100;
      sy = (bitmap.height * s.y) / 100;
      sw = (bitmap.width * s.cropWidth) / 100;
      sh = (bitmap.height * s.cropHeight) / 100;
      if (
        sw < 1 ||
        sh < 1 ||
        sx + sw > bitmap.width + 0.1 ||
        sy + sh > bitmap.height + 0.1
      )
        throw new Error(
          'The crop area must fit inside the image. Reduce its width, height, or starting position.',
        );
      w = sw;
      h = sh;
    }
    if (operation === 'rotate' && Math.abs(s.rotation) % 180 !== 0) {
      w = bitmap.height;
      h = bitmap.width;
    }
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    const format = ['png', 'jpeg', 'webp'].includes(operation)
      ? operation
      : s.format;
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    if (operation === 'rotate') {
      ctx.translate(w / 2, h / 2);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    } else if (operation === 'flip') {
      ctx.translate(s.vertical ? 0 : w, s.vertical ? h : 0);
      ctx.scale(s.vertical ? 1 : -1, s.vertical ? -1 : 1);
      ctx.drawImage(bitmap, 0, 0, w, h);
    } else {
      if (operation === 'grayscale') ctx.filter = 'grayscale(1)';
      if (operation === 'blur') ctx.filter = `blur(${s.amount / 10}px)`;
      if (operation === 'brightness') ctx.filter = `brightness(${s.amount}%)`;
      if (operation === 'contrast') ctx.filter = `contrast(${s.amount}%)`;
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
      ctx.filter = 'none';
    }
    if (operation === 'text') {
      ctx.fillStyle = s.color;
      ctx.font = `600 ${s.fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        s.text,
        (w * (s.x || 50)) / 100,
        (h * (s.y || 85)) / 100,
        w * 0.95,
      );
    }
    let blob = await canvasBlob(canvas, 'image/' + format, s.quality / 100);
    if (operation === 'compress') {
      const { default: compress } = await import('browser-image-compression');
      blob = await compress(new File([blob], file.name, { type: blob.type }), {
        maxSizeMB:
          s.targetKB > 0
            ? s.targetKB / 1024
            : Math.max(blob.size / 1048576, 0.001),
        initialQuality: s.quality / 100,
        useWebWorker: true,
        fileType: 'image/' + format,
        onProgress,
        maxIteration: 12,
        alwaysKeepResolution: true,
      });
    }
    onProgress(100);
    return {
      blob,
      name:
        cleanName(file.name) +
        '-' +
        operation +
        '.' +
        (format === 'jpeg' ? 'jpg' : format),
      detail: `${canvas.width} × ${canvas.height} px · ${blob.type.replace('image/', '').toUpperCase()}`,
      originalSize: file.size,
    };
  } finally {
    bitmap.close();
  }
}
