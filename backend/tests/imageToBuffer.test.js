import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { imageToBuffer } from '../services/awsRekognitionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

describe('imageToBuffer local upload path resolution', () => {
  const testDir = path.join(backendDir, 'public', 'uploads', 'test-fixtures');
  const testFile = path.join(testDir, 'sample.jpg');
  const fixtureBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testFile, fixtureBytes);
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('resolves a stored web path (e.g. profilePicture) against backend/public/uploads', async () => {
    const buffer = await imageToBuffer('/uploads/test-fixtures/sample.jpg');
    expect(buffer).not.toBeNull();
    expect(buffer.equals(fixtureBytes)).toBe(true);
  });

  it('returns null for an upload path that does not exist on disk', async () => {
    const buffer = await imageToBuffer('/uploads/test-fixtures/does-not-exist.jpg');
    expect(buffer).toBeNull();
  });
});
