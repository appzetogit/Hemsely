import { jest } from '@jest/globals';

// Verifies compareFacesWithAWS no longer fails open: a thrown AWS SDK error
// must NOT auto-verify the user (it previously returned verified: true).
describe('compareFacesWithAWS on AWS SDK failure', () => {
  const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    jest.unstable_mockModule('@aws-sdk/client-rekognition', () => ({
      RekognitionClient: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockRejectedValue(new Error('simulated AWS outage')),
      })),
      CompareFacesCommand: jest.fn(),
      DetectFacesCommand: jest.fn(),
    }));
  });

  afterAll(() => {
    process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
    process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
  });

  it('returns verified: false instead of silently auto-approving', async () => {
    const { compareFacesWithAWS } = await import('../services/awsRekognitionService.js');
    const selfieBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const profileBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

    const result = await compareFacesWithAWS(profileBuffer, selfieBuffer);

    expect(result.verified).toBe(false);
    expect(result.success).toBe(false);
    expect(result.error).toBe(true);
  });
});
