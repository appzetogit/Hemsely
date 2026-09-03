import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { compressImage } from './imageOptimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

export async function syncFileToRemoteVPS(buffer, folder, filename) {
  const syncEnabled = process.env.ENABLE_VPS_MEDIA_SYNC === 'true' || process.env.ENABLE_VPS_MEDIA_SYNC === '1';
  const vpsUrl = process.env.VPS_SYNC_URL || process.env.VPS_MEDIA_URL || (process.env.NODE_ENV !== 'production' ? 'https://hemsely.com' : null);
  const syncSecret = process.env.MEDIA_SYNC_SECRET;

  if (!syncEnabled || !vpsUrl || !syncSecret) {
    return { skipped: true };
  }

  // Prevent recursive sync if running directly in production without explicit sync target
  if (process.env.NODE_ENV === 'production' && !process.env.VPS_SYNC_URL) {
    return { skipped: true, reason: 'Production environment' };
  }

  try {
    const cleanVpsUrl = vpsUrl.replace(/\/+$/, '');
    const syncEndpoint = `${cleanVpsUrl}/api/media/sync`;

    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    formData.append('file', blob, filename);
    formData.append('folder', folder);
    formData.append('filename', filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'x-sync-secret': syncSecret,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[VPS Media Sync Warning] Remote VPS responded with status ${res.status}: ${errText}`);
      return { synced: false, status: res.status, error: errText };
    }

    const data = await res.json().catch(() => ({}));
    console.log(`[VPS Media Sync] Successfully synced ${folder}/${filename} to ${cleanVpsUrl}`);
    return { synced: true, data };
  } catch (syncError) {
    console.warn(`[VPS Media Sync Notice] Failed to sync ${filename} to VPS: ${syncError.message}`);
    return { synced: false, error: syncError.message };
  }
}

export function uploadToLocal(buffer, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const folder = options.folder || 'uploads';
      const isVideo = options.resource_type === 'video';

      let finalBuffer = buffer;
      let fileExtension = isVideo ? 'mp4' : 'jpg';

      if (!isVideo) {
        // No fallback here: if the image can't be decoded/compressed, the upload
        // must be rejected rather than storing the raw, unverified bytes.
        const compressed = await compressImage(buffer, { folder });
        finalBuffer = compressed.buffer;
        fileExtension = compressed.extension;
      }

      // Dynamic path guarantee using absolute directory
      const targetDir = path.join(backendDir, 'public', 'uploads', folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      const filename = `${uniqueId}.${fileExtension}`;
      const filepath = path.join(targetDir, filename);

      fs.writeFile(filepath, finalBuffer, async (err) => {
        if (err) return reject(err);
        const relativeUrl = `/uploads/${folder}/${filename}`;

        // Attempt VPS sync in the background (does not fail the local upload if VPS is temporarily unreachable)
        syncFileToRemoteVPS(finalBuffer, folder, filename).catch((syncErr) => {
          console.warn('[VPS Media Sync Async Warning]:', syncErr.message);
        });

        resolve({
          secure_url: relativeUrl,
          url: relativeUrl,
          path: relativeUrl,
          filename: filename,
          public_id: `${folder}/${filename.replace('.' + fileExtension, '')}`,
          bytes: finalBuffer.length,
          format: fileExtension
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Memory Storage Engine for Multer
const memoryStorage = multer.memoryStorage();

export const createLocalUploadMiddleware = (folder, isMultiple = false, fieldName = 'file', maxCount = 10) => {
  const upload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images and videos are allowed'));
      }
    },
  });

  const multerHandler = isMultiple ? upload.array(fieldName, maxCount) : upload.single(fieldName);

  return (req, res, next) => {
    multerHandler(req, res, async (err) => {
      if (err) return next(err);

      try {
        if (!isMultiple && req.file) {
          const result = await uploadToLocal(req.file.buffer, { folder });
          req.file.path = result.path;
          req.file.secure_url = result.secure_url;
          req.file.url = result.url;
        } else if (isMultiple && req.files && req.files.length > 0) {
          await Promise.all(req.files.map(async (file) => {
            const result = await uploadToLocal(file.buffer, { folder });
            file.path = result.path;
            file.secure_url = result.secure_url;
            file.url = result.url;
          }));
        }
        next();
      } catch (uploadErr) {
        next(uploadErr);
      }
    });
  };
};
