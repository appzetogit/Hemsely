import { jest } from '@jest/globals';
import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Regression test for a bug found during manual QA: verifySelfieAWS was sending
// req.file.buffer (the raw, uncompressed upload) to AWS Rekognition instead of the
// compressed on-disk copy at req.file.path. Real phone-camera photos regularly exceed
// AWS's 5MB TargetImage.Bytes limit, so every such selfie silently failed AWS and got
// routed to manual review — even though the same file, once compressed by the upload
// middleware (max 800x800 @ q75), would easily have passed and matched.
describe('verifySelfieAWS uses the compressed upload, not the raw buffer', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const backendDir = path.resolve(__dirname, '..');

  let capturedTargetBytes = null;

  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    jest.unstable_mockModule('@aws-sdk/client-rekognition', () => ({
      RekognitionClient: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockImplementation((command) => {
          capturedTargetBytes = command?.input?.TargetImage?.Bytes || null;
          return Promise.resolve({ FaceMatches: [{ Similarity: 100 }] });
        }),
      })),
      CompareFacesCommand: jest.fn().mockImplementation((input) => ({ input })),
      DetectFacesCommand: jest.fn().mockImplementation((input) => ({ input })),
    }));
  });

  afterAll(() => {
    process.env.AWS_ACCESS_KEY_ID = '';
    process.env.AWS_SECRET_ACCESS_KEY = '';
  });

  it('sends the compressed on-disk file, not the original oversized buffer', async () => {
    const { default: request } = await import('supertest');
    const { default: app } = await import('../app.js');
    const { default: User } = await import('../models/User.js');
    const { default: jwt } = await import('jsonwebtoken');

    // A noisy (non-solid-color) 1600x1600 image so resizing to the upload
    // middleware's default 800x800/q75 cap produces a clearly different,
    // smaller byte sequence than the original — proving which one was sent.
    const noisy = new Jimp({ width: 1200, height: 1200 });
    for (let x = 0; x < noisy.bitmap.width; x += 1) {
      for (let y = 0; y < noisy.bitmap.height; y += 1) {
        const v = Math.floor(Math.random() * 0xffffff);
        noisy.setPixelColor(((v << 8) | 0xff) >>> 0, x, y);
      }
    }
    const originalBuffer = await noisy.getBuffer('image/jpeg', { quality: 90 });
    expect(originalBuffer.length).toBeGreaterThan(200 * 1024);
    expect(originalBuffer.length).toBeLessThan(10 * 1024 * 1024);

    const user = await User.create({
      firstName: 'Compression',
      lastName: 'Test',
      phoneNumber: '+19998887701',
      isVerified: false,
      selfieStatus: 'not_submitted',
      profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const res = await request(app)
      .post('/api/users/selfie-verify-aws')
      .set('Authorization', `Bearer ${token}`)
      .attach('selfie', originalBuffer, 'noisy.jpg');

    expect(res.statusCode).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(capturedTargetBytes).not.toBeNull();

    // The bytes actually handed to AWS must match what the upload middleware wrote
    // to disk (compressed), not the original oversized buffer.
    const updatedUser = await User.findById(user._id);
    const onDiskPath = path.join(backendDir, 'public', updatedUser.selfiePhoto.replace(/^\//, ''));
    const onDiskBytes = fs.readFileSync(onDiskPath);

    expect(Buffer.compare(Buffer.from(capturedTargetBytes), onDiskBytes)).toBe(0);
    expect(capturedTargetBytes.length).toBeLessThan(originalBuffer.length);
  });
});
