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
import userRoutes from './routes/userRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import fcmRoutes from './routes/fcmRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

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
const uploadFolders = ['amora/profiles', 'amora/chats', 'amora/selfies', 'test-fixtures'];
uploadFolders.forEach((folder) => {
  const dirPath = path.join(__dirname, 'public', 'uploads', folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Serve static assets using strict absolute paths (supports both /uploads, /api/uploads, /amora, and /public/uploads prefixes)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/amora', express.static(path.join(__dirname, 'public', 'uploads', 'amora')));
app.use('/amora', express.static(path.join(__dirname, 'uploads', 'amora')));
app.use(express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Smart static file fallback for uploads (guarantees image delivery regardless of Nginx proxy path rewriting)
app.get(['/uploads/*', '/api/uploads/*', '/amora/*', '/public/uploads/*'], (req, res, next) => {
  const cleanPath = req.path
    .replace(/^\/api\/uploads\//, '')
    .replace(/^\/uploads\//, '')
    .replace(/^\/public\/uploads\//, '')
    .replace(/^\/amora\//, 'amora/');

  const candidatePaths = [
    path.join(__dirname, 'public', 'uploads', cleanPath),
    path.join(__dirname, 'uploads', cleanPath),
    path.join(__dirname, 'public', 'uploads', 'amora', 'profiles', path.basename(cleanPath)),
    path.join(__dirname, 'public', 'uploads', 'amora', 'chats', path.basename(cleanPath)),
    path.join(__dirname, 'public', 'uploads', 'amora', 'selfies', path.basename(cleanPath)),
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
  }
  next();
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
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/users', '/users'], apiRateLimiter, userRoutes);
app.use(['/api/subscriptions', '/subscriptions'], apiRateLimiter, userRoutes);
app.use(['/api/matches', '/matches'], apiRateLimiter, matchRoutes);
app.use(['/api/messages', '/messages'], apiRateLimiter, messageRoutes);
app.use(['/api/support', '/support'], supportRoutes);
app.use(['/api/fcm', '/fcm'], fcmRoutes);
app.use(['/api/notifications', '/notifications'], apiRateLimiter, notificationRoutes);
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
