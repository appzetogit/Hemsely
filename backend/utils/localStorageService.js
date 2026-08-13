import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { compressImage } from './imageOptimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

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

      fs.writeFile(filepath, finalBuffer, (err) => {
        if (err) return reject(err);
        const relativeUrl = `/uploads/${folder}/${filename}`;

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
