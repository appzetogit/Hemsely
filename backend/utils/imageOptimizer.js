import sharp from 'sharp';

const FOLDER_PROFILES = {
  'amora/profiles': { maxWidth: 600, maxHeight: 600, quality: 80 },
  'amora/chats': { maxWidth: 800, maxHeight: 800, quality: 75 },
  'profile-images': { maxWidth: 400, maxHeight: 400, quality: 80 },
  'menu-items': { maxWidth: 800, maxHeight: 800, quality: 75 },
  'banners': { maxWidth: 1200, maxHeight: 600, quality: 78 },
  default: { maxWidth: 800, maxHeight: 800, quality: 75 },
};

export async function compressImage(inputBuffer, opts = {}) {
  const originalSize = inputBuffer.length;
  if (opts.isVideo) return { buffer: inputBuffer, originalSize, compressedSize: originalSize, mimeType: 'video/mp4', extension: 'mp4' };

  const folderKey = opts.folder || 'default';
  const { maxWidth, maxHeight, quality } = FOLDER_PROFILES[folderKey] || FOLDER_PROFILES.default;

  try {
    const image = sharp(inputBuffer, { failOn: 'none' }).rotate();
    const meta = await image.metadata();

    if (meta.format === 'gif') {
      const outBuffer = await image.gif().toBuffer();
      return { buffer: outBuffer, originalSize, compressedSize: outBuffer.length, mimeType: 'image/gif', extension: 'gif' };
    }

    const resized = (meta.width > maxWidth || meta.height > maxHeight)
      ? image.resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
      : image;

    const hasAlpha = meta.format === 'png' && meta.hasAlpha;
    const outputMime = hasAlpha ? 'image/png' : 'image/jpeg';
    const outputExt = hasAlpha ? 'png' : 'jpg';

    const outBuffer = hasAlpha
      ? await resized.png({ quality, compressionLevel: 8 }).toBuffer()
      : await resized.jpeg({ quality, mozjpeg: true }).toBuffer();

    return {
      buffer: outBuffer,
      originalSize,
      compressedSize: outBuffer.length,
      mimeType: outputMime,
      extension: outputExt,
    };
  } catch (err) {
    console.error('❌ Sharp Error: Falling back to raw buffer:', err.message);
    return { buffer: inputBuffer, originalSize, compressedSize: originalSize, mimeType: 'application/octet-stream', extension: 'jpg' };
  }
}
