/** Target size that fits within `max`×`max`, keeping the aspect ratio, never upscaling. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Resizes a photo on the device before upload (no crop): smaller uploads on
 * mobile data and the EXIF metadata (including GPS) is dropped by the canvas.
 */
export async function resizeImage(file: File, max = 1024, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality),
  );
}

/** Message when a picked file cannot be decoded as an image (UX2-22). */
export function photoReadError(file: { size: number }): string {
  const mb = file.size / (1024 * 1024);
  if (mb > 10)
    return `This file is too large (${Math.round(mb)} MB) and could not be read as a photo. Choose a photo under 10 MB.`;
  return 'This photo could not be read. Try another one.';
}
