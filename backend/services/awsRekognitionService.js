import { RekognitionClient, CompareFacesCommand, DetectFacesCommand } from '@aws-sdk/client-rekognition';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

/**
 * Helper to convert an image source (URL, file path, or Buffer) into a Buffer for AWS Rekognition.
 */
export async function imageToBuffer(imageInput) {
    if (!imageInput) return null;
    if (Buffer.isBuffer(imageInput)) {
        return imageInput;
    }

    if (typeof imageInput === 'string') {
        // If local file path (uploads are served from backend/public, e.g. "/uploads/hemsely/profiles/xxx.jpg").
        // Note: on Windows, path.isAbsolute('/foo') is true (drive-root-relative), so a naive isAbsolute
        // check would treat these web paths as OS-absolute and skip the public/ prefix entirely — always
        // resolve against backendDir/public first, and only fall back to a literal OS path if that misses.
        if (imageInput.startsWith('/') || imageInput.startsWith('./') || imageInput.includes('uploads')) {
            const relativePath = imageInput.startsWith('/') ? imageInput.slice(1) : imageInput;
            const publicPath = path.join(backendDir, 'public', relativePath);
            if (fs.existsSync(publicPath)) {
                return fs.readFileSync(publicPath);
            }
            if (path.isAbsolute(imageInput) && fs.existsSync(imageInput)) {
                return fs.readFileSync(imageInput);
            }

            // Fallback: If missing on local disk, fetch from remote VPS if configured
            const vpsMediaUrl = process.env.VPS_MEDIA_URL || (process.env.NODE_ENV !== 'production' ? 'https://hemsely.com' : null);
            if (vpsMediaUrl) {
                try {
                    const cleanVps = vpsMediaUrl.replace(/\/+$/, '');
                    const cleanRelative = relativePath.replace(/^uploads\//, '');
                    const remoteUrl = `${cleanVps}/uploads/${cleanRelative}`;
                    const response = await axios.get(remoteUrl, { responseType: 'arraybuffer', timeout: 10000 });
                    if (response.status === 200 && response.data) {
                        const buffer = Buffer.from(response.data);
                        // Cache locally
                        try {
                            const dir = path.dirname(publicPath);
                            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                            fs.writeFileSync(publicPath, buffer);
                        } catch {
                            // ignore caching write error
                        }
                        return buffer;
                    }
                } catch {
                    // ignore network/fetch error and fall through
                }
            }
        }

        // If HTTP URL
        if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            const response = await axios.get(imageInput, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        }

        // If base64 data URL
        if (imageInput.startsWith('data:image')) {
            const base64Data = imageInput.split(',')[1];
            return Buffer.from(base64Data, 'base64');
        }
    }

    return null;
}

const isNoFaceError = (err) =>
    err?.name === 'InvalidParameterException' ||
    err?.name === 'InvalidImageFormatException' ||
    err?.name === 'ImageTooLargeException' ||
    /no face|faces in the image|invalid parameters/i.test(err?.message || '');

/**
 * Verifies a live selfie against ALL of the user's photos with AWS Rekognition.
 *  - selfie must contain exactly one face (DetectFaces)
 *  - selfie is the CompareFaces source (largest face = the live person) and each
 *    profile/gallery photo is the target, so group photos still match
 *  - verified when the best similarity >= AWS_REKOGNITION_MIN_SIMILARITY
 *
 * Result flags: verified | rejected (+ noFaceDetected) | pending (manual review) | error
 *
 * @param {string|Buffer|Array<string|Buffer>} profilePhotoInputs - user's photos (url/path/buffer)
 * @param {string|Buffer} selfiePhotoInput - captured selfie (url/path/buffer)
 */
export async function compareFacesWithAWS(profilePhotoInputs, selfiePhotoInput) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
    const region = process.env.AWS_REGION || 'us-east-1';
    const minSimilarity = parseFloat(process.env.AWS_REKOGNITION_MIN_SIMILARITY || '80');

    const selfieBuffer = await imageToBuffer(selfiePhotoInput);
    if (!selfieBuffer) {
        return { success: false, verified: false, rejected: true, similarity: 0, isMock: false, message: 'Selfie image could not be processed. Please retake.' };
    }

    // Without AWS keys we can't verify anything — never auto-approve, send to admin review.
    if (!accessKeyId || !secretAccessKey) {
        console.warn('[AWS Rekognition Service] AWS keys missing — selfie routed to manual review.');
        return { success: true, verified: false, pending: true, similarity: 0, isMock: true, message: 'Selfie submitted. Under review for manual verification.' };
    }

    const client = new RekognitionClient({ region, credentials: { accessKeyId, secretAccessKey } });

    try {
        // 1. The selfie itself must show exactly one clear face
        let faces;
        try {
            faces = (await client.send(new DetectFacesCommand({ Image: { Bytes: selfieBuffer } }))).FaceDetails || [];
        } catch (err) {
            if (!isNoFaceError(err)) throw err;
            faces = [];
        }
        if (faces.length === 0) {
            return { success: true, verified: false, rejected: true, noFaceDetected: true, similarity: 0, isMock: false, message: 'No face detected. Please retake the selfie in good lighting, looking straight at the camera.' };
        }
        if (faces.length > 1) {
            return { success: true, verified: false, rejected: true, similarity: 0, isMock: false, message: 'More than one face detected. Please make sure only you are in the selfie.' };
        }

        // 2. Compare against every profile/gallery photo, keep the best score
        const inputs = (Array.isArray(profilePhotoInputs) ? profilePhotoInputs : [profilePhotoInputs]).filter(Boolean);
        let best = 0;
        let compared = 0;
        for (const input of inputs) {
            let target;
            try {
                target = await imageToBuffer(input);
            } catch {
                target = null;
            }
            if (!target) continue;
            try {
                const res = await client.send(new CompareFacesCommand({
                    SourceImage: { Bytes: selfieBuffer },
                    TargetImage: { Bytes: target },
                    SimilarityThreshold: 0, // get the real score, threshold applied below
                }));
                compared += 1;
                const top = Math.max(0, ...(res.FaceMatches || []).map((m) => m.Similarity || 0));
                if (top > best) best = top;
                if (best >= minSimilarity) break;
            } catch (err) {
                if (!isNoFaceError(err)) throw err;
                console.warn('[AWS Rekognition Service] Skipping photo without a usable face:', err.message);
            }
        }

        const similarity = Math.round(best * 10) / 10;
        if (best >= minSimilarity) {
            return { success: true, verified: true, similarity, isMock: false, message: `Face matched with your profile photos (${similarity}% similarity).` };
        }
        if (compared === 0) {
            // Nothing to compare against (no photos / no faces in photos) — needs a human
            return { success: true, verified: false, pending: true, similarity: 0, isMock: false, message: 'We could not find your face in your profile photos. Your selfie is under manual review.' };
        }
        return { success: true, verified: false, rejected: true, similarity, isMock: false, message: "Your selfie doesn't match your profile photos. Please retake it, or update your photos so your face is clearly visible." };
    } catch (error) {
        console.error('[AWS Rekognition Service Error]:', error.name, error.message || error);
        return { success: false, verified: false, pending: true, error: true, similarity: 0, isMock: false, message: 'Verification service is unavailable right now. Your selfie is under manual review.' };
    }
}

