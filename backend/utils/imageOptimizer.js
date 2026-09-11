let sharpModule = null;

async function getSharp() {
  if (sharpModule !== null) return sharpModule;
  try {
    const mod = await import('sharp');
    const sharp = mod.default || mod;
    
    // CPU & Memory Protection for VPS environments:
    // Limit libvips concurrency to prevent pegging 100% of all VPS CPU cores
    if (typeof sharp.concurrency === 'function') {
      const maxThreads = parseInt(process.env.SHARP_CONCURRENCY || '1', 10);
      sharp.concurrency(maxThreads);
    }
    // Enable SIMD vector instructions for faster CPU processing
    if (typeof sharp.simd === 'function') {
      sharp.simd(true);
    }
    // Restrict cache size to prevent memory bloat and CPU cache thrashing
    if (typeof sharp.cache === 'function') {
      sharp.cache({ memory: 50, files: 20, items: 100 });
    }

    sharpModule = sharp;
  } catch (err) {
    console.warn('⚠️ [ImageOptimizer] Sharp package is not available:', err.message);
    sharpModule = false;
  }
  return sharpModule;
}

const FOLDER_PROFILES = {
  'hemsely/profiles': { maxWidth: 1600, maxHeight: 2000, quality: 85 },
  'hemsely/chats': { maxWidth: 1200, maxHeight: 1600, quality: 80 },
  'profile-images': { maxWidth: 1200, maxHeight: 1600, quality: 85 },
  'menu-items': { maxWidth: 800, maxHeight: 800, quality: 75 },
  'banners': { maxWidth: 1600, maxHeight: 800, quality: 80 },
  default: { maxWidth: 1200, maxHeight: 1600, quality: 80 },
};

export async function compressImage(inputBuffer, opts = {}) {
  const originalSize = inputBuffer.length;
  if (opts.isVideo) return { buffer: inputBuffer, originalSize, compressedSize: originalSize, mimeType: 'video/mp4', extension: 'mp4' };

  const sharp = await getSharp();
  if (!sharp) {
    return {
      buffer: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      mimeType: opts.mimeType || 'image/jpeg',
      extension: 'jpg',
    };
  }

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
      ? await resized.png({ quality, compressionLevel: 6 }).toBuffer()
      : await resized.jpeg({ quality, mozjpeg: false }).toBuffer();

    return {
      buffer: outBuffer,
      originalSize,
      compressedSize: outBuffer.length,
      mimeType: outputMime,
      extension: outputExt,
    };
  } catch (err) {
    // Never fall back to storing the raw, undecoded buffer — if sharp can't decode
    // it as an image, it isn't one (regardless of what the client's mimetype header
    // claimed), and writing it to disk under an image extension risks storing an
    // HTML/SVG polyglot that later gets served back as static content.
    console.error('❌ Sharp Error: rejecting file that could not be decoded as an image:', err.message);
    throw new Error('File could not be processed as a valid image');
  }
}

