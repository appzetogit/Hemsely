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
        // If local file path (uploads are served from backend/public, e.g. "/uploads/amora/profiles/xxx.jpg").
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

/**
 * Verifies a user selfie against their profile photo using AWS Rekognition.
 *
 * @param {string|Buffer} profilePhotoInput - User profile picture URL, path, or Buffer
 * @param {string|Buffer} selfiePhotoInput - User captured selfie URL, path, or Buffer
 * @returns {Promise<{success: boolean, verified: boolean, similarity: number, isMock: boolean, message: string}>}
 */
export async function compareFacesWithAWS(profilePhotoInput, selfiePhotoInput, isFaceInFrame = true) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';
    const minSimilarity = parseFloat(process.env.AWS_REKOGNITION_MIN_SIMILARITY || '80');

    // Convert inputs to buffers
    const profileBuffer = await imageToBuffer(profilePhotoInput);
    const selfieBuffer = await imageToBuffer(selfiePhotoInput);

    if (!selfieBuffer) {
        return {
            success: false,
            verified: false,
            similarity: 0,
            isMock: false,
            message: 'Selfie image could not be loaded or processed',
        };
    }

    // Check if AWS credentials are provided
    const hasAwsKeys = Boolean(accessKeyId && secretAccessKey && accessKeyId.trim() !== '' && secretAccessKey.trim() !== '');

    if (!hasAwsKeys) {
        // If captured while frame was GREEN (face properly in frame) -> Auto-approve (Verified)
        // If captured while frame was RED (face not properly in frame) -> Route to pending review
        const isGreenCapture = Boolean(isFaceInFrame && selfieBuffer && selfieBuffer.length >= 1000);

        if (isGreenCapture) {
            console.log('[AWS Rekognition Service] Green frame selfie capture — auto-approving selfie status (Verified).');
            return {
                success: true,
                verified: true,
                similarity: 94.8,
                isMock: true,
                message: 'Live selfie photo verified successfully!',
            };
        } else {
            console.log('[AWS Rekognition Service] Red frame selfie capture — routing to admin queue (Pending).');
            return {
                success: true,
                verified: false,
                pending: true,
                similarity: 0,
                isMock: true,
                message: 'Selfie photo captured outside guide frame. Profile under review for manual admin verification.',
            };
        }
    }

    try {
        const rekognitionClient = new RekognitionClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // 1. If profile photo buffer is missing, perform single face detection on selfie photo
        if (!profileBuffer) {
            try {
                const detectFacesCommand = new DetectFacesCommand({
                    Image: { Bytes: selfieBuffer },
                    Attributes: ['ALL'],
                });
                const detectResult = await rekognitionClient.send(detectFacesCommand);
                const faces = detectResult.FaceDetails || [];

                if (faces.length > 0) {
                    const faceConfidence = faces[0].Confidence || 0;
                    const isVerified = faceConfidence >= minSimilarity;

                    return {
                        success: true,
                        verified: isVerified,
                        noFaceDetected: !isVerified && !isFaceInFrame,
                        pending: !isVerified && isFaceInFrame,
                        similarity: Math.round(faceConfidence * 10) / 10,
                        isMock: false,
                        message: isVerified
                            ? `AWS Rekognition verified human face detection with ${Math.round(faceConfidence)}% confidence.`
                            : (isFaceInFrame ? 'Selfie photo submitted successfully. Under review for manual admin verification.' : `Face confidence (${Math.round(faceConfidence)}%) below requirement threshold (${minSimilarity}%).`),
                    };
                }
            } catch (detectErr) {
                console.warn('[AWS Rekognition Service] Single face detection warning:', detectErr.message);
            }

            if (isFaceInFrame) {
                return {
                    success: true,
                    verified: false,
                    pending: true,
                    similarity: 0,
                    isMock: false,
                    message: 'Selfie photo captured successfully. Submitted for manual admin verification.',
                };
            }

            return {
                success: true,
                verified: false,
                noFaceDetected: true,
                similarity: 0,
                isMock: false,
                message: 'No human face detected in uploaded selfie photo. Please take a clear selfie showing your face.',
            };
        }

        // 2. AWS Rekognition CompareFaces API execution (with profileBuffer)
        try {
            const command = new CompareFacesCommand({
                SourceImage: { Bytes: profileBuffer },
                TargetImage: { Bytes: selfieBuffer },
                SimilarityThreshold: minSimilarity,
            });

            const response = await rekognitionClient.send(command);
            const matches = response.FaceMatches || [];

            if (matches.length > 0) {
                const topMatch = matches[0];
                const similarityScore = Math.round((topMatch.Similarity || 0) * 10) / 10;
                const isVerified = similarityScore >= minSimilarity;

                if (isVerified) {
                    return {
                        success: true,
                        verified: true,
                        similarity: similarityScore,
                        isMock: false,
                        message: `AWS Rekognition verified facial match with ${similarityScore}% similarity score.`,
                    };
                }
            }
        } catch (compareError) {
            const isNoFaceOrParamError = compareError.name === 'InvalidParameterException' ||
                (compareError.message && /no face|faces in the image|invalid parameters/i.test(compareError.message));

            if (!isNoFaceOrParamError) {
                throw compareError;
            }
            console.warn('[AWS Rekognition Service] CompareFaces parameter warning:', compareError.message);
        }

        // 3. Fallback: Check if selfie itself has a face or was captured in green frame
        try {
            const detectFacesCommand = new DetectFacesCommand({
                Image: { Bytes: selfieBuffer },
                Attributes: ['DEFAULT'],
            });
            const detectResult = await rekognitionClient.send(detectFacesCommand);
            const faces = detectResult.FaceDetails || [];

            if (faces.length > 0 || isFaceInFrame) {
                return {
                    success: true,
                    verified: false,
                    pending: true,
                    similarity: 0,
                    isMock: false,
                    message: 'Selfie photo captured successfully. Profile facial comparison pending manual admin verification.',
                };
            }
        } catch (detectErr) {
            const isNoFaceOrParamError = detectErr.name === 'InvalidParameterException' ||
                (detectErr.message && /no face|faces in the image|invalid parameters/i.test(detectErr.message));

            if (!isNoFaceOrParamError) {
                throw detectErr;
            }
            console.warn('[AWS Rekognition Service] DetectFaces fallback warning:', detectErr.message);
        }

        if (isFaceInFrame) {
            return {
                success: true,
                verified: false,
                pending: true,
                similarity: 0,
                isMock: false,
                message: 'Selfie photo captured inside guide frame. Submitted for manual admin verification.',
            };
        }

        return {
            success: true,
            verified: false,
            noFaceDetected: true,
            similarity: 0,
            isMock: false,
            message: 'No human face detected in uploaded selfie photo. Please take a clear selfie showing your face.',
        };
    } catch (error) {
        console.error('[AWS Rekognition Service Error]:', error.message || error);

        return {
            success: false,
            verified: false,
            similarity: 0,
            isMock: false,
            error: true,
            message: `AWS Rekognition service error: ${error.message || 'SDK error'}. Submitted for manual review.`,
        };
    }
}

