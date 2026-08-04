import adminModule from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const admin = adminModule?.credential ? adminModule : (adminModule?.default || adminModule);

let cachedServiceAccount = null;

/**
 * Reads and parses service account JSON file securely.
 */
function readServiceAccountJsonFile(resolvedPath) {
  let raw = fs.readFileSync(resolvedPath, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  const json = JSON.parse(raw);
  if (!json.private_key || typeof json.private_key !== 'string') {
    throw new Error('Service account JSON missing private_key');
  }
  return json;
}

/**
 * Loads service account credentials object from JSON file or environment variables.
 */
export function loadServiceAccountObject() {
  if (cachedServiceAccount) {
    return cachedServiceAccount;
  }

  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(process.cwd(), explicitPath);

    if (fs.existsSync(resolved)) {
      try {
        cachedServiceAccount = readServiceAccountJsonFile(resolved);
        console.log('✅ Firebase Admin: service account loaded from', path.basename(resolved));
        return cachedServiceAccount;
      } catch (e) {
        console.error('❌ Firebase Admin: invalid service account file:', e.message);
      }
    } else {
      console.warn('⚠️ Firebase Admin: service account file not found at:', resolved);
    }
  }

  // Fallback to individual .env credentials if set
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    cachedServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
    console.log('✅ Firebase Admin: service account loaded from env variables');
    return cachedServiceAccount;
  }

  return null;
}

/**
 * Ensures Firebase Admin default app is initialized.
 */
export function ensureFirebaseAdminApp() {
  if (Array.isArray(admin?.apps) && admin.apps.length > 0) {
    return true;
  }

  try {
    const sa = loadServiceAccountObject();
    if (!sa) {
      console.warn('⚠️ Firebase Admin: No service account credentials found.');
      return false;
    }

    const projectId = sa.project_id || sa.projectId || process.env.FIREBASE_PROJECT_ID || 'hemsely-d2910';

    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId,
    });

    console.log('✅ Firebase Admin: default app initialized successfully');
    return true;
  } catch (err) {
    if (err?.code === 'app/duplicate-app') {
      return true;
    }
    console.error('❌ Firebase Admin init error:', err.message);
    return false;
  }
}
