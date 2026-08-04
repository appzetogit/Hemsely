import { jest } from '@jest/globals';

describe('AWS Rekognition Selfie Verification API', () => {
  const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    jest.unstable_mockModule('@aws-sdk/client-rekognition', () => ({
      RekognitionClient: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockImplementation(() => Promise.resolve({ FaceMatches: [{ Similarity: 95.5 }] })),
      })),
      CompareFacesCommand: jest.fn().mockImplementation((input) => ({ input })),
      DetectFacesCommand: jest.fn().mockImplementation((input) => ({ input })),
    }));
  });

  afterAll(() => {
    process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
    process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
  });

  it('successfully verifies selfie photo using AWS Rekognition and activates account', async () => {
    const { default: request } = await import('supertest');
    const { default: app } = await import('../app.js');
    const { default: User } = await import('../models/User.js');
    const { default: jwt } = await import('jsonwebtoken');

    const user = await User.create({
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+19998887766',
      isVerified: false,
      selfieStatus: 'not_submitted',
      profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1d' });

    const res = await request(app)
      .post('/api/users/selfie-verify-aws')
      .set('Authorization', `Bearer ${token}`)
      .field('selfieData', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(true);
    expect(res.body.similarity).toBeGreaterThan(0);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isVerified).toBe(true);
    expect(updatedUser.selfieStatus).toBe('approved');
  });

  it('auto-approves proper live selfie capture in dev mode', async () => {
    process.env.AWS_ACCESS_KEY_ID = '';
    process.env.AWS_SECRET_ACCESS_KEY = '';

    const { default: request } = await import('supertest');
    const { default: app } = await import('../app.js');
    const { default: User } = await import('../models/User.js');
    const { default: jwt } = await import('jsonwebtoken');

    const user = await User.create({
      firstName: 'Live',
      lastName: 'Photo',
      phoneNumber: '+19998887768',
      isVerified: false,
      selfieStatus: 'not_submitted',
      profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1d' });

    // Generate a valid image payload buffer > 1000 bytes simulating a live camera selfie capture
    const fakeLivePhoto = 'data:image/jpeg;base64,' + 'A'.repeat(2000);

    const res = await request(app)
      .post('/api/users/selfie-verify-aws')
      .set('Authorization', `Bearer ${token}`)
      .field('selfieData', fakeLivePhoto);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(true);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isVerified).toBe(true);
    expect(updatedUser.selfieStatus).toBe('approved');
  });

  it('routes improper camera photo capture to manual admin review', async () => {
    process.env.AWS_ACCESS_KEY_ID = '';
    process.env.AWS_SECRET_ACCESS_KEY = '';

    const { default: request } = await import('supertest');
    const { default: app } = await import('../app.js');
    const { default: User } = await import('../models/User.js');
    const { default: jwt } = await import('jsonwebtoken');

    const user = await User.create({
      firstName: 'Bad',
      lastName: 'Photo',
      phoneNumber: '+19998887767',
      isVerified: false,
      selfieStatus: 'not_submitted',
      profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1d' });

    const res = await request(app)
      .post('/api/users/selfie-verify-aws')
      .set('Authorization', `Bearer ${token}`)
      .field('selfieData', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(false);
    expect(res.body.pending).toBe(true);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isVerified).toBe(false);
    expect(updatedUser.selfieStatus).toBe('pending');
  });
});
