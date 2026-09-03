import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import { getOrCreateConfig } from './controllers/appConfigController.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { csrfProtection } from './middleware/csrf.js';
import { corsOptionsDelegate } from './utils/originUtils.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes, { subscriptionRouter } from './routes/userRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import fcmRoutes from './routes/fcmRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import mediaSyncRoutes from './routes/mediaSyncRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// crossOriginResourcePolicy is relaxed to 'cross-origin' because uploaded
// images are served from this origin but rendered on the frontend's origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(cors(corsOptionsDelegate));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(csrfProtection);

app.set('view engine', 'ejs');

// Ensure required public/uploads subdirectories exist at startup
const uploadFolders = ['hemsely/profiles', 'hemsely/chats', 'hemsely/selfies', 'test-fixtures'];
uploadFolders.forEach((folder) => {
  const dirPath = path.join(__dirname, 'public', 'uploads', folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Serve static assets using strict absolute paths (supports both /uploads, /api/uploads, /hemsely, and /public/uploads prefixes)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/hemsely', express.static(path.join(__dirname, 'public', 'uploads', 'hemsely')));
app.use('/hemsely', express.static(path.join(__dirname, 'uploads', 'hemsely')));
app.use(express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Smart static file fallback for uploads (guarantees image delivery regardless of Nginx proxy path rewriting + fetches from VPS if missing locally)
app.get(['/uploads/*', '/api/uploads/*', '/hemsely/*', '/public/uploads/*'], async (req, res, next) => {
  const cleanPath = req.path
    .replace(/^\/api\/uploads\//, '')
    .replace(/^\/uploads\//, '')
    .replace(/^\/public\/uploads\//, '')
    .replace(/^\/hemsely\//, 'hemsely/');

  const uploadsRoot = path.join(__dirname, 'uploads');
  const publicUploadsRoot = path.join(__dirname, 'public', 'uploads');
  const filenameOnly = path.basename(cleanPath);

  const candidatePaths = [
    path.join(publicUploadsRoot, cleanPath),
    path.join(uploadsRoot, cleanPath),
    path.join(publicUploadsRoot, 'hemsely', 'profiles', filenameOnly),
    path.join(publicUploadsRoot, 'hemsely', 'chats', filenameOnly),
    path.join(publicUploadsRoot, 'hemsely', 'selfies', filenameOnly),
    path.join(uploadsRoot, 'hemsely', 'profiles', filenameOnly),
    path.join(uploadsRoot, 'hemsely', 'chats', filenameOnly),
    path.join(uploadsRoot, 'hemsely', 'selfies', filenameOnly),
    path.join(publicUploadsRoot, filenameOnly),
    path.join(uploadsRoot, filenameOnly),
  ];

  const resolvedPublicRoot = path.resolve(publicUploadsRoot).toLowerCase();
  const resolvedUploadsRoot = path.resolve(uploadsRoot).toLowerCase();

  for (const filePath of candidatePaths) {
    const normalized = path.normalize(filePath);
    const normalizedLower = path.resolve(normalized).toLowerCase();
    const isContained =
      normalizedLower.startsWith(resolvedPublicRoot + path.sep.toLowerCase()) ||
      normalizedLower.startsWith(resolvedUploadsRoot + path.sep.toLowerCase()) ||
      normalizedLower.startsWith(resolvedPublicRoot) ||
      normalizedLower.startsWith(resolvedUploadsRoot);

    if (isContained && fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
      return res.sendFile(path.resolve(normalized));
    }
  }

  // If file is not found on local disk, attempt fetching from remote VPS if configured
  const vpsMediaUrl = process.env.VPS_MEDIA_URL || (process.env.NODE_ENV !== 'production' ? 'https://hemsely.com' : null);
  if (vpsMediaUrl) {
    try {
      const cleanVps = vpsMediaUrl.replace(/\/+$/, '');
      const remoteUrls = [
        `${cleanVps}/uploads/${cleanPath}`,
        `${cleanVps}/uploads/hemsely/profiles/${filenameOnly}`,
        `${cleanVps}/uploads/hemsely/chats/${filenameOnly}`,
        `${cleanVps}/uploads/hemsely/selfies/${filenameOnly}`,
        `${cleanVps}/${cleanPath}`,
      ];

      for (const remoteUrl of remoteUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const remoteRes = await fetch(remoteUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (remoteRes.ok) {
            const contentType = remoteRes.headers.get('content-type') || 'image/jpeg';
            // Only accept valid media content types
            if (contentType.includes('text/html') || contentType.includes('application/json')) {
              continue;
            }

            const arrayBuffer = await remoteRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Auto-cache to local public/uploads directory for future zero-latency access
            try {
              const savePath = path.join(publicUploadsRoot, cleanPath);
              const saveDir = path.dirname(savePath);
              if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
              }
              await fs.promises.writeFile(savePath, buffer);
            } catch (cacheErr) {
              console.warn('[Upload Fallback Cache Notice]:', cacheErr.message);
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.status(200).send(buffer);
          }
        } catch {
          // try next remote URL
        }
      }
    } catch (proxyErr) {
      console.warn(`[Upload Fallback Remote Proxy Error]: ${proxyErr.message}`);
    }
  }

  console.warn(`[Upload Fallback] File not found on disk or remote VPS for URL: ${req.url}`);
  res.status(404).send('Image file not found on server disk or remote VPS');
});

// Maintenance mode: short-circuits all non-admin API traffic while the flag is on,
// so admins can still log in and flip it back off.
app.use(async (req, res, next) => {
  if (
    req.path.startsWith('/admin') ||
    req.path.startsWith('/api/admin') ||
    req.path === '/health' ||
    req.path === '/api/health'
  ) {
    return next();
  }
  try {
    const config = await getOrCreateConfig();
    if (config.maintenanceMode) {
      return res.status(503).json({
        success: false,
        message: 'The app is temporarily down for maintenance. Please check back soon.',
      });
    }
  } catch {
    // If the config lookup itself fails, don't block the whole API on it.
  }
  next();
});

import { getPublicWebsitePageBySlug } from './controllers/websitePageController.js';

// Routes (supports both /api/* and direct /* paths for flexible reverse proxy setups)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/admin', '/admin'], (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
}, adminRoutes);
app.use(['/api/users', '/users'], apiRateLimiter, userRoutes);
app.use(['/api/subscriptions', '/subscriptions'], apiRateLimiter, subscriptionRouter);
app.use(['/api/matches', '/matches'], apiRateLimiter, matchRoutes);
app.use(['/api/messages', '/messages'], apiRateLimiter, messageRoutes);
app.use(['/api/support', '/support'], supportRoutes);
app.use(['/api/fcm', '/fcm'], fcmRoutes);
app.use(['/api/notifications', '/notifications'], apiRateLimiter, notificationRoutes);
app.use(['/api/media', '/media'], mediaSyncRoutes);
app.get(['/api/pages/:slug', '/pages/:slug'], getPublicWebsitePageBySlug);

// Health check route
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;
