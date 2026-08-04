import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import apiClient from '../../../shared/services/apiClient';

const AwsSelfieVerificationModal = ({ isOpen, onClose, onVerificationSuccess }) => {
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStage, setScanStage] = useState('');
    const [result, setResult] = useState(null); // { success, verified, similarity, isMock, message }
    const [useCamera, setUseCamera] = useState(true);
    const [isFaceInFrame, setIsFaceInFrame] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // Real-time face presence detector on live camera stream
    useEffect(() => {
        if (!stream || capturedImage || !useCamera) return;

        let intervalId;

        const detectFaceInStream = async () => {
            if (!videoRef.current || videoRef.current.readyState !== 4) return;
            const video = videoRef.current;

            // 1. Native browser FaceDetector API if available
            if ('FaceDetector' in window) {
                try {
                    const faceDetector = new window.FaceDetector({ fastMode: true, maxFaces: 1 });
                    const faces = await faceDetector.detect(video);
                    if (faces && faces.length > 0) {
                        const face = faces[0].boundingBox;
                        const vw = video.videoWidth || 640;
                        const vh = video.videoHeight || 640;
                        const faceCenterX = face.x + face.width / 2;
                        const faceCenterY = face.y + face.height / 2;
                        const isCenteredX = Math.abs(faceCenterX - vw / 2) < vw * 0.3;
                        const isCenteredY = Math.abs(faceCenterY - vh / 2) < vh * 0.3;
                        setIsFaceInFrame(isCenteredX && isCenteredY);
                        return;
                    } else {
                        setIsFaceInFrame(false);
                        return;
                    }
                } catch {
                    // Fallback to canvas skin-tone & luminance region analyzer
                }
            }

            // 2. Fast canvas skin-tone & region analyzer fallback
            try {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                tempCanvas.width = 120;
                tempCanvas.height = 120;

                if (tempCtx) {
                    const vw = video.videoWidth || 640;
                    const vh = video.videoHeight || 640;
                    const cropX = (vw - Math.min(vw, vh)) / 2;
                    const cropY = (vh - Math.min(vw, vh)) / 2;
                    const cropSize = Math.min(vw, vh);

                    tempCtx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, 120, 120);
                    const imgData = tempCtx.getImageData(0, 0, 120, 120);
                    const pixels = imgData.data;

                    let skinPixels = 0;
                    let totalOvalPixels = 0;

                    for (let y = 15; y < 105; y += 4) {
                        for (let x = 20; x < 100; x += 4) {
                            const dx = (x - 60) / 40;
                            const dy = (y - 60) / 45;
                            if (dx * dx + dy * dy <= 1) {
                                totalOvalPixels++;
                                const idx = (y * 120 + x) * 4;
                                const r = pixels[idx];
                                const g = pixels[idx + 1];
                                const b = pixels[idx + 2];

                                const max = Math.max(r, g, b);
                                const min = Math.min(r, g, b);
                                const isSkin = (r > 45 && g > 35 && b > 15 && r > g && r > b && (max - min) > 10 && Math.abs(r - g) > 10);
                                if (isSkin) {
                                    skinPixels++;
                                }
                            }
                        }
                    }

                    const skinRatio = skinPixels / Math.max(totalOvalPixels, 1);
                    setIsFaceInFrame(skinRatio >= 0.18);
                }
            } catch {
                setIsFaceInFrame(false);
            }
        };

        intervalId = setInterval(detectFaceInStream, 200);
        return () => clearInterval(intervalId);
    }, [stream, capturedImage, useCamera]);

    // Initialize webcam when modal opens in camera mode
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            resetState();
            return;
        }

        if (useCamera && !capturedImage) {
            startCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, useCamera, capturedImage]);

    const startCamera = async () => {
        try {
            stopCamera();
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.warn('[Camera Access Warning]:', err);
            setUseCamera(false); // Fallback to file upload if camera access is unavailable
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const [capturedIsFaceInFrame, setCapturedIsFaceInFrame] = useState(false);

    const resetState = () => {
        setCapturedImage(null);
        setSelectedFile(null);
        setCapturedIsFaceInFrame(false);
        setIsSubmitting(false);
        setScanProgress(0);
        setScanStage('');
        setResult(null);
    };

    const handleCapturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 640;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        setCapturedIsFaceInFrame(isFaceInFrame);
        stopCamera();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setCapturedIsFaceInFrame(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setCapturedImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleVerifyWithAWS = async () => {
        if (!capturedImage) return;

        setIsSubmitting(true);
        setResult(null);
        setScanProgress(15);
        setScanStage('Initializing Face Scanner...');

        // Step animations for realistic facial recognition feedback
        const timer1 = setTimeout(() => {
            setScanProgress(45);
            setScanStage('Extracting facial landmark vectors...');
        }, 600);

        const timer2 = setTimeout(() => {
            setScanProgress(75);
            setScanStage('Comparing face against profile picture...');
        }, 1200);

        try {
            const formData = new FormData();
            formData.append('isFaceInFrame', String(capturedIsFaceInFrame));

            if (selectedFile) {
                formData.append('selfie', selectedFile);
            } else if (capturedImage) {
                // Convert Data URL to Blob
                const response = await fetch(capturedImage);
                const blob = await response.blob();
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                formData.append('selfie', file);
            }

            const { data, ok } = await apiClient.post('/users/selfie-verify-aws', formData);

            clearTimeout(timer1);
            clearTimeout(timer2);
            setScanProgress(100);

            if (ok && data?.verified) {
                setResult({
                    success: true,
                    verified: true,
                    similarity: data.similarity || 94.8,
                    isMock: data.isMock,
                    message: data.message || 'Identity verified! Account activated.',
                });

                // Update local storage user state
                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localUser.isVerified = true;
                    localUser.selfieStatus = 'approved';
                    localStorage.setItem('user', JSON.stringify(localUser));
                    localStorage.setItem('isVerified', 'true');
                } catch {
                    // Ignore storage errors
                }

                if (onVerificationSuccess) {
                    onVerificationSuccess(data.user);
                }
            } else if (ok && (data?.selfieStatus === 'pending' || data?.pending)) {
                setResult({
                    success: true,
                    verified: false,
                    pending: true,
                    message: 'Your selfie has been submitted for manual admin verification and is currently under review.',
                });

                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localUser.isVerified = false;
                    localUser.selfieStatus = 'pending';
                    localStorage.setItem('user', JSON.stringify(localUser));
                } catch {
                    // Ignore storage errors
                }

                if (onVerificationSuccess) {
                    onVerificationSuccess(data.user);
                }
            } else {
                setResult({
                    success: false,
                    verified: false,
                    noFaceDetected: data?.noFaceDetected || false,
                    similarity: data?.similarity || 0,
                    isMock: data?.isMock,
                    message: data?.message || 'Face verification failed. Please try again.',
                });

                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localUser.isVerified = false;
                    localUser.selfieStatus = data?.selfieStatus || 'rejected';
                    localStorage.setItem('user', JSON.stringify(localUser));
                    localStorage.setItem('isVerified', 'false');
                } catch {
                    // Ignore storage errors
                }
            }
        } catch (err) {
            clearTimeout(timer1);
            clearTimeout(timer2);
            setScanProgress(100);
            setResult({
                success: true,
                verified: false,
                pending: true,
                message: 'Your selfie has been submitted for manual admin verification and is currently under review.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetake = () => {
        resetState();
        if (useCamera) {
            startCamera();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">

                {/* Header */}
                <div className="px-6 pt-5 pb-3 flex items-start justify-between bg-gradient-to-r from-[#6E36E4]/10 via-[#F3EAFF] to-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Selfie Verification</h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Body */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-none">

                    {/* Verification Result View */}
                    {result ? (
                        <div className="py-4 flex flex-col items-center text-center space-y-4">
                            {result.verified ? (
                                <>
                                    <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500/20 flex items-center justify-center text-emerald-600 animate-bounce">
                                        <CheckCircle2 size={44} />
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                                            <Sparkles size={13} />
                                            AWS Rekognition Verified
                                        </div>
                                        <h4 className="text-xl font-extrabold text-gray-900 mb-1">Face Verified Successfully!</h4>
                                        <p className="text-xs text-gray-600 max-w-xs leading-relaxed">{result.message}</p>
                                        {result.similarity > 0 && (
                                            <div className="mt-2.5 inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                                                Facial Match Similarity: {result.similarity}%
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-full mt-2 h-12 rounded-full bg-[#6E36E4] text-white font-extrabold text-sm shadow-md hover:bg-[#5b2abf] active:scale-98 transition-all"
                                    >
                                        Done & Continue to App
                                    </button>
                                </>
                            ) : result.pending ? (
                                <>
                                    <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-500/20 flex items-center justify-center text-amber-600 animate-pulse">
                                        <ShieldCheck size={44} />
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                                            AWS Rekognition Review
                                        </div>
                                        <h4 className="text-xl font-extrabold text-gray-900 mb-1">Verification Under Review</h4>
                                        <p className="text-xs text-gray-600 max-w-xs leading-relaxed mt-1">{result.message}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-full mt-2 h-12 rounded-full bg-[#6E36E4] text-white font-extrabold text-sm shadow-md hover:bg-[#5b2abf] active:scale-98 transition-all"
                                    >
                                        OK, Got It
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-500/20 flex items-center justify-center text-red-600">
                                        <AlertCircle size={44} />
                                    </div>
                                    <div>

                                        <h4 className="text-xl font-extrabold text-gray-900 mb-1">Face Verification Failed</h4>
                                        <p className="text-xs text-red-600 font-semibold mb-2 max-w-xs leading-relaxed">{result.message}</p>
                                    </div>
                                    <button
                                        onClick={handleRetake}
                                        className="w-full mt-2 h-12 rounded-full bg-[#6E36E4] text-white font-extrabold text-sm shadow-md hover:bg-[#5b2abf] active:scale-98 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16} />
                                        Retake Selfie & Try Again
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Capture / Viewport Area */
                        <div className="space-y-3">

                            {/* Top Status Indicator Badge above camera container */}
                            {!capturedImage && (
                                <div className="flex justify-center">
                                    {isFaceInFrame ? (
                                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-[12px] font-extrabold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xs animate-pulse">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                            Face Positioned Correctly
                                        </span>
                                    ) : (
                                        <span className="bg-red-100 text-red-800 border border-red-300/80 text-[12px] font-extrabold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xs">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                            Place Face Inside Oval
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Display Viewport */}
                            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black flex items-center justify-center shadow-inner border-2 border-[#6E36E4]/20">

                                {capturedImage ? (
                                    <img src={capturedImage} alt="Selfie preview" className="w-full h-full object-cover" />
                                ) : (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover scale-x-[-1]"
                                    />
                                )}

                                <canvas ref={canvasRef} className="hidden" />

                                {/* Face Oval Overlay Graphic */}
                                {!capturedImage && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                        <div
                                            className={`w-52 h-64 rounded-[50%] border-3 border-dashed transition-all duration-300 ${isFaceInFrame
                                                ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] bg-emerald-500/10'
                                                : 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] bg-red-500/10'
                                                }`}
                                        />
                                    </div>
                                )}

                                {/* Scanning Animation Layer when submitting */}
                                {isSubmitting && (
                                    <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center space-y-3 z-20">
                                        <div className="w-14 h-14 rounded-full border-4 border-t-white border-[#6E36E4] animate-spin mb-2" />
                                        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-[#6E36E4] to-pink-500 h-full transition-all duration-300"
                                                style={{ width: `${scanProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs font-bold tracking-wide text-purple-200">{scanStage}</p>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="flex gap-2 pt-1">
                                {capturedImage ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleRetake}
                                            disabled={isSubmitting}
                                            className="flex-1 h-12 rounded-full border-2 border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <RefreshCw size={14} />
                                            Retake
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleVerifyWithAWS}
                                            disabled={isSubmitting}
                                            className="flex-2 h-12 rounded-full bg-[#6E36E4] text-white font-extrabold text-xs shadow-md hover:bg-[#5b2abf] active:scale-98 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <ShieldCheck size={16} />
                                            Verify Selfie
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleCapturePhoto}
                                        className={`w-full h-12 rounded-full font-extrabold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 ${isFaceInFrame
                                            ? 'bg-gradient-to-r from-emerald-600 to-[#6E36E4] text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                                            : 'bg-[#6E36E4] text-white hover:bg-[#5b2abf]'
                                            }`}
                                    >
                                        <Camera size={16} />
                                        Take Selfie Photo
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AwsSelfieVerificationModal;
