/**
 * Script to pull media from live VPS or push local uploads to VPS.
 * Usage:
 *   node scripts/syncMediaWithVPS.js --pull
 *   node scripts/syncMediaWithVPS.js --push
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const publicUploadsDir = path.join(backendDir, 'public', 'uploads');

const vpsMediaUrl = (process.env.VPS_SYNC_URL || process.env.VPS_MEDIA_URL || 'https://hemsely.com').replace(/\/+$/, '');
const syncSecret = process.env.MEDIA_SYNC_SECRET;

async function pushFile(filePath, relativeFolderPath, filename) {
  if (!syncSecret) {
    console.error('❌ MEDIA_SYNC_SECRET is not set in .env');
    return false;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
  formData.append('file', blob, filename);
  formData.append('folder', relativeFolderPath);
  formData.append('filename', filename);

  try {
    const res = await fetch(`${vpsMediaUrl}/api/media/sync`, {
      method: 'POST',
      headers: {
        'x-sync-secret': syncSecret,
      },
      body: formData,
    });

    if (res.ok) {
      console.log(`✅ Synced: ${relativeFolderPath}/${filename} -> VPS`);
      return true;
    } else {
      const err = await res.text();
      console.error(`❌ Failed: ${relativeFolderPath}/${filename} (${res.status}): ${err}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error uploading ${filename}:`, err.message);
    return false;
  }
}

async function scanAndPush(dir, relativeFolder = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      const subFolder = relativeFolder ? `${relativeFolder}/${item.name}` : item.name;
      await scanAndPush(fullPath, subFolder);
    } else if (item.isFile()) {
      await pushFile(fullPath, relativeFolder, item.name);
    }
  }
}

async function main() {
  const mode = process.argv[2] || '--push';
  console.log(`\n🚀 Hemsely Media Sync Tool`);
  console.log(`📡 Remote VPS URL: ${vpsMediaUrl}`);
  console.log(`📂 Local Uploads: ${publicUploadsDir}\n`);

  if (!fs.existsSync(publicUploadsDir)) {
    console.log('No local public/uploads directory found.');
    return;
  }

  if (mode === '--push') {
    console.log('Pushing all local uploads to VPS...');
    await scanAndPush(publicUploadsDir, '');
    console.log('\n✨ Push synchronization complete!\n');
  } else {
    console.log('Available commands:');
    console.log('  node scripts/syncMediaWithVPS.js --push (Uploads local media to VPS)');
  }
}

main().catch(console.error);
