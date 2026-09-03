import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const publicUploadsRoot = path.join(backendDir, 'public', 'uploads');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for sync
});

// Middleware to authenticate sync requests using secret token
export const verifySyncSecret = (req, res, next) => {
  const secret = process.env.MEDIA_SYNC_SECRET;
  if (!secret || secret.trim() === '') {
    return res.status(403).json({
      success: false,
      message: 'Media sync is disabled on this server (MEDIA_SYNC_SECRET is not configured).',
    });
  }

  const incomingSecret =
    req.headers['x-sync-secret'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : null) ||
    req.body?.syncSecret;

  if (!incomingSecret || incomingSecret !== secret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing media sync secret.',
    });
  }

  next();
};

/**
 * @route POST /api/media/sync
 * @desc Syncs a media file buffer from a client/local environment to this server's uploads directory.
 * @access Protected by MEDIA_SYNC_SECRET
 */
router.post('/sync', upload.single('file'), verifySyncSecret, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No file buffer provided for sync.',
      });
    }

    // Sanitize folder and filename to prevent directory traversal
    const rawFolder = (req.body.folder || 'hemsely/profiles').toString();
    const cleanFolder = rawFolder
      .replace(/\\/g, '/')
      .replace(/\.\./g, '')
      .replace(/[^a-zA-Z0-9_\-\/]/g, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    const rawFilename = (req.body.filename || req.file.originalname || `sync_${Date.now()}.jpg`).toString();
    const cleanFilename = path.basename(rawFilename).replace(/[^a-zA-Z0-9_\-\.]/g, '');

    if (!cleanFilename) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename specified.',
      });
    }

    const targetDir = path.join(publicUploadsRoot, cleanFolder);
    const resolvedTargetDir = path.resolve(targetDir);
    const resolvedUploadsRoot = path.resolve(publicUploadsRoot);

    // Ensure resolved path is strictly inside public/uploads
    if (!resolvedTargetDir.startsWith(resolvedUploadsRoot)) {
      return res.status(400).json({
        success: false,
        message: 'Forbidden target folder path.',
      });
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filepath = path.join(targetDir, cleanFilename);
    await fs.promises.writeFile(filepath, req.file.buffer);

    const relativeUrl = `/uploads/${cleanFolder ? cleanFolder + '/' : ''}${cleanFilename}`;

    return res.status(200).json({
      success: true,
      message: 'Media synced successfully.',
      path: relativeUrl,
      filename: cleanFilename,
      bytes: req.file.buffer.length,
    });
  } catch (error) {
    console.error('[Media Sync Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to write synced media to disk.',
      error: error.message,
    });
  }
});

export default router;
