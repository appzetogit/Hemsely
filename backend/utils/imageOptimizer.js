import { Jimp } from 'jimp';

const FOLDER_PROFILES = {
  'amora/profiles': { maxWidth: 600, maxHeight: 600, quality: 80 },
  'amora/chats': { maxWidth: 800, maxHeight: 800, quality: 75 },
  'profile-images': { maxWidth: 400, maxHeight: 400, quality: 80 },
  'menu-items': { maxWidth: 800, maxHeight: 800, quality: 75 },
  'banners': { maxWidth: 1200, maxHeight: 600, quality: 78 },
  default: { maxWidth: 800, maxHeight: 800, quality: 75 },
};

function detectMimeType(buffer) {
  if (!buffer || buffer.length < 4) return 'unknown';
  const b = buffer;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  return 'unknown';
}

export async function compressImage(inputBuffer, opts = {}) {
  const originalSize = inputBuffer.length;
  if (opts.isVideo) return { buffer: inputBuffer, originalSize, compressedSize: originalSize, mimeType: 'video/mp4', extension: 'mp4' };

  const mimeType = detectMimeType(inputBuffer);
  if (mimeType === 'unknown') {
    return { buffer: inputBuffer, originalSize, compressedSize: originalSize, mimeType: 'application/octet-stream', extension: 'bin' };
  }

  const folderKey = opts.folder || 'default';
  const { maxWidth, maxHeight, quality } = FOLDER_PROFILES[folderKey] || FOLDER_PROFILES.default;

  try {
    const image = await Jimp.read(inputBuffer);
    const origW = image.bitmap.width;
    const origH = image.bitmap.height;

    if (origW > maxWidth || origH > maxHeight) {
      image.scaleToFit({ w: maxWidth, h: maxHeight });
    }

    if (mimeType === 'image/gif') {
      const outBuffer = await image.getBuffer('image/gif');
      return { buffer: outBuffer, originalSize, compressedSize: outBuffer.length, mimeType: 'image/gif', extension: 'gif' };
    }

    let outputMime = 'image/jpeg';
    let outputExt = 'jpg';

    // Preserve PNG transparency
    const hasAlpha = mimeType === 'image/png' && image.bitmap.data.some((v, i) => i % 4 === 3 && v < 255);
    if (hasAlpha) {
      outputMime = 'image/png';
      outputExt = 'png';
    }

    let outBuffer = outputMime === 'image/jpeg'
      ? await image.getBuffer('image/jpeg', { quality })
      : await image.getBuffer('image/png');

    return {
      buffer: outBuffer,
      originalSize,
      compressedSize: outBuffer.length,
      mimeType: outputMime,
      extension: outputExt,
    };
  } catch (err) {
    console.error('❌ Jimp Error: Falling back to raw buffer:', err.message);
    return { buffer: inputBuffer, originalSize, compressedSize: originalSize, mimeType, extension: mimeType.split('/')[1] || 'jpg' };
  }
}
