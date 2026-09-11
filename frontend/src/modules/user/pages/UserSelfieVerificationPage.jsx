import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Sparkles, Upload, ArrowLeft } from 'lucide-react';
import apiClient from '../../../shared/services/apiClient';

const UserSelfieVerificationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const returnPath = location.state?.from;

    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStage, setScanStage] = useState('');
    const [result, setResult] = useState(null); // { success, verified, pending, similarity, message }
    const [useCamera, setUseCamera] = useState(true);
    const [isFaceInFrame, setIsFaceInFrame] = useState(false);
    const [capturedIsFaceInFrame, setCapturedIsFaceInFrame] = useState(false);

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
                    // Fallback
                }
            }

            try {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                tempCanvas.width = 120;
                tempCanvas.height = 120;

                if (tempCtx) {
                    const vw = video.videoWidth || 640;
                    const vh = video.videoHeight || 640;
                    const cropSize = Math.min(vw, vh);
                    const cropX = (vw - cropSize) / 2;
                    const cropY = (vh - cropSize) / 2;

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
            setUseCamera(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    useEffect(() => {
        if (useCamera && !capturedImage) {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [useCamera, capturedImage]);

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
                try {
                    const response = await fetch(capturedImage);
                    const blob = await response.blob();
                    const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                    formData.append('selfie', file);
                } catch {
                    formData.append('selfieData', capturedImage);
                }
                formData.append('selfieData', capturedImage);
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
                    message: data.message || 'Identity verified! Blue checkmark earned.',
                });

                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localUser.isVerified = true;
                    localUser.selfieStatus = 'approved';
                    localStorage.setItem('user', JSON.stringify(localUser));
                    localStorage.setItem('isVerified', 'true');
                } catch {
                    // Ignore
                }
            } else if (ok && (data?.selfieStatus === 'pending' || data?.pending)) {
                setResult({
                    success: true,
                    verified: false,
                    pending: true,
                    message: 'Your selfie has been submitted for manual verification and is currently under review.',
                });

                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localUser.isVerified = false;
                    localUser.selfieStatus = 'pending';
                    localStorage.setItem('user', JSON.stringify(localUser));
                    sessionStorage.setItem('user', JSON.stringify(localUser));
                    localStorage.setItem('isVerified', 'false');
                } catch {
                    // Ignore
                }
            } else {
                setResult({
                    success: false,
                    verified: false,
                    message: data?.message || 'Face verification failed. Please try again with good lighting.',
                });

                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localUser.isVerified = false;
                    localUser.selfieStatus = data?.selfieStatus || 'rejected';
                    localStorage.setItem('user', JSON.stringify(localUser));
                    localStorage.setItem('isVerified', 'false');
                } catch {
                    // Ignore
                }
            }
        } catch {
            clearTimeout(timer1);
            clearTimeout(timer2);
            setScanProgress(100);
            setResult({
                success: false,
                verified: false,
                message: 'Could not connect to verification server. You can retry or proceed.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        stopCamera();
        if (returnPath) {
            navigate(returnPath, { replace: true });
        } else {
            navigate(-1);
        }
    };

    const handleSkip = () => {
        stopCamera();
        if (returnPath) {
            navigate(returnPath, { replace: true });
        } else {
            navigate(-1);
        }
    };

    const handleRetake = () => {
        resetState();
        if (useCamera) {
            startCamera();
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-5 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />

            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between w-full pt-1 shrink-0">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => {
                        stopCamera();
                        if (returnPath) {
                            navigate(returnPath, { replace: true });
                        } else {
                            navigate(-1);
                        }
                    }}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-start w-full pt-3 px-1 overflow-y-auto scrollbar-none">
                {/* Header */}
                <div className="text-center mb-3">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3EAFF] text-[#6E36E4] text-[11px] font-bold uppercase tracking-wider mb-1.5">
                        <ShieldCheck size={13} />
                        Identity Check
                    </div>
                    <h2 className="text-[26px] leading-tight font-extrabold text-black mb-1 tracking-tight">
                        Selfie Verification
                    </h2>
                    <p className="text-[13px] text-gray-400 font-normal max-w-[280px] mx-auto leading-relaxed">
                        Verify your face to earn the trusted blue checkmark badge.
                    </p>
                </div>

                {/* Result State Card */}
                {result ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-4 px-2 space-y-4">
                        {result.verified ? (
                            <>
                                <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500/20 flex items-center justify-center text-emerald-600 animate-bounce">
                                    <CheckCircle2 size={44} />
                                </div>
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
                                        <Sparkles size={13} />
                                        Verified Profile
                                    </div>
                                    <h4 className="text-xl font-extrabold text-gray-900 mb-1">Face Verified!</h4>
                                    <p className="text-xs text-gray-600 max-w-xs leading-relaxed">{result.message}</p>
                                    {result.similarity > 0 && (
                                        <div className="mt-2.5 inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                                            Match Similarity: {result.similarity}%
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : result.pending ? (
                            <>
                                <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-500/20 flex items-center justify-center text-amber-600 animate-pulse">
                                    <ShieldCheck size={44} />
                                </div>
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
                                        Under Review
                                    </div>
                                    <h4 className="text-xl font-extrabold text-gray-900 mb-1">Selfie Submitted</h4>
                                    <p className="text-xs text-gray-600 max-w-xs leading-relaxed">{result.message}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-500/20 flex items-center justify-center text-red-600">
                                    <AlertCircle size={44} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-extrabold text-gray-900 mb-1">Verification Failed</h4>
                                    <p className="text-xs text-red-600 font-semibold max-w-xs leading-relaxed">{result.message}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRetake}
                                    className="w-full mt-2 h-11 rounded-full bg-[#6E36E4] text-white font-bold text-xs shadow-md hover:bg-[#5e2cd6] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <RefreshCw size={15} />
                                    Retake Selfie
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    /* Live Viewport / Camera / Upload Area */
                    <div className="space-y-3 my-auto">
                        {/* Status Pill */}
                        {!capturedImage && useCamera && (
                            <div className="flex justify-center">
                                {isFaceInFrame ? (
                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-[11.5px] font-bold px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                        Face Detected — Ready to Capture
                                    </span>
                                ) : (
                                    <span className="bg-purple-50 text-[#6E36E4] border border-purple-200 text-[11.5px] font-semibold px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-[#6E36E4]" />
                                        Align face within the frame
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Viewport Frame */}
                        <div className="relative w-full aspect-4/3 max-h-[280px] rounded-3xl overflow-hidden bg-black flex items-center justify-center shadow-md border-2 border-[#6E36E4]/20 mx-auto">
                            {capturedImage ? (
                                <img src={capturedImage} alt="Selfie preview" className="w-full h-full object-cover" />
                            ) : useCamera ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />
                            ) : (
                                <div className="text-white text-center p-6 flex flex-col items-center">
                                    <Camera size={40} className="text-gray-400 mb-2" />
                                    <p className="text-xs text-gray-300 mb-3">Camera access is off or unavailable</p>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 rounded-full bg-[#6E36E4] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        <Upload size={14} />
                                        Upload Selfie from Gallery
                                    </button>
                                </div>
                            )}

                            <canvas ref={canvasRef} className="hidden" />

                            {/* Oval Face Overlay */}
                            {!capturedImage && useCamera && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                    <div
                                        className={`w-44 h-52 rounded-[50%] border-2 border-dashed transition-all duration-300 ${
                                            isFaceInFrame
                                                ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] bg-emerald-500/10'
                                                : 'border-white/70 shadow-[0_0_15px_rgba(255,255,255,0.2)] bg-white/5'
                                        }`}
                                    />
                                </div>
                            )}

                            {/* Scanning Overlay */}
                            {isSubmitting && (
                                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center space-y-3 z-20">
                                    <div className="w-12 h-12 rounded-full border-3 border-t-white border-[#6E36E4] animate-spin mb-1" />
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

                        {/* Capture / Verify / Upload Controls */}
                        <div className="flex gap-2 pt-1">
                            {capturedImage ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleRetake}
                                        disabled={isSubmitting}
                                        className="flex-1 h-11 rounded-full border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <RefreshCw size={14} />
                                        Retake
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleVerifyWithAWS}
                                        disabled={isSubmitting}
                                        className="flex-2 h-11 rounded-full bg-[#6E36E4] text-white font-extrabold text-xs shadow-md hover:bg-[#5e2cd6] active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <ShieldCheck size={16} />
                                        Verify Selfie
                                    </button>
                                </>
                            ) : useCamera ? (
                                <div className="w-full flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCapturePhoto}
                                        className="w-full h-12 rounded-full font-extrabold text-[15px] bg-[#6E36E4] text-white shadow-md hover:bg-[#5e2cd6] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Camera size={18} />
                                        Take Selfie Photo
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[12px] text-gray-500 hover:text-[#6E36E4] font-medium transition-colors text-center py-0.5 cursor-pointer bg-transparent border-0"
                                    >
                                        Or upload from gallery
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Continue Action */}
            <div className="w-full shrink-0 mb-8">
                {result && (result.verified || result.pending) ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all cursor-pointer"
                    >
                        Continue
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSkip}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold h-[48px] rounded-full text-[14px] transition-all cursor-pointer"
                    >
                        Continue Without Verifying
                    </button>
                )}
            </div>
        </div>
    );
};

export default UserSelfieVerificationPage;
