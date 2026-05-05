// @ts-nocheck

export const RASTER_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const RASTER_SIGNATURES = [
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], extra: [0x57, 0x45, 0x42, 0x50], extraOffset: 8 },
];

function bytesMatch(bytes, signature, offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export async function isAllowedRasterImageFile(file) {
  const type = String(file?.type || '').toLowerCase();
  if (!RASTER_IMAGE_MIME_TYPES.has(type)) return false;

  try {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const signature = RASTER_SIGNATURES.find((entry) => entry.type === type);
    if (!signature || !bytesMatch(bytes, signature.bytes)) return false;
    if (signature.extra && !bytesMatch(bytes, signature.extra, signature.extraOffset || 0)) return false;
    return true;
  } catch {
    return false;
  }
}
