import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mediaSyncRoutes, { verifySyncSecret } from '../routes/mediaSyncRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const testUploadsDir = path.join(backendDir, 'public', 'uploads', 'test_sync');

describe('Media Sync Routes & Authentication', () => {
  let app;
  const originalSecret = process.env.MEDIA_SYNC_SECRET;

  beforeAll(() => {
    process.env.MEDIA_SYNC_SECRET = 'test_secret_key_123';
    app = express();
    app.use(express.json());
    app.use('/api/media', mediaSyncRoutes);
  });

  afterAll(() => {
    process.env.MEDIA_SYNC_SECRET = originalSecret;
    // Clean up test directory if created
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  it('rejects sync requests without authorization secret', async () => {
    const res = await request(app)
      .post('/api/media/sync')
      .field('folder', 'test_sync')
      .field('filename', 'test1.jpg')
      .attach('file', Buffer.from('fake image content'), 'test1.jpg');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects sync requests with incorrect authorization secret', async () => {
    const res = await request(app)
      .post('/api/media/sync')
      .set('x-sync-secret', 'wrong_secret')
      .field('folder', 'test_sync')
      .field('filename', 'test1.jpg')
      .attach('file', Buffer.from('fake image content'), 'test1.jpg');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('successfully syncs and writes file to disk when secret is valid', async () => {
    const fileBuffer = Buffer.from('simulated-valid-image-data-for-hemsely');
    const res = await request(app)
      .post('/api/media/sync')
      .set('x-sync-secret', 'test_secret_key_123')
      .field('folder', 'test_sync')
      .field('filename', 'unit_test_image.jpg')
      .attach('file', fileBuffer, 'unit_test_image.jpg');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.path).toBe('/uploads/test_sync/unit_test_image.jpg');

    // Verify file exists on disk
    const expectedFilePath = path.join(testUploadsDir, 'unit_test_image.jpg');
    expect(fs.existsSync(expectedFilePath)).toBe(true);
    const content = fs.readFileSync(expectedFilePath);
    expect(content.toString()).toBe('simulated-valid-image-data-for-hemsely');
  });

  it('sanitizes directory traversal attempts in folder parameter', async () => {
    const fileBuffer = Buffer.from('traversal-test-content');
    const res = await request(app)
      .post('/api/media/sync')
      .set('x-sync-secret', 'test_secret_key_123')
      .field('folder', '../../test_sync')
      .field('filename', 'traversal.jpg')
      .attach('file', fileBuffer, 'traversal.jpg');

    expect(res.status).toBe(200);
    // Should be sanitized to test_sync
    const expectedFilePath = path.join(testUploadsDir, 'traversal.jpg');
    expect(fs.existsSync(expectedFilePath)).toBe(true);
  });
});
