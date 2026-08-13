import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import { cropImageToSquare } from '../../../shared/utils/imageCrop';

const AddPhotosPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const returnPath = location.state?.from;

    const initialPhotos = React.useMemo(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('onboarding_photos:v1') || '{}');
            if (Array.isArray(saved.photos) && saved.photos.length > 0) {
                const list = [...saved.photos];
                while (list.length < 6) list.push(null);
                return list.slice(0, 6);
            }
        } catch {
            // Ignore
        }
        return [null, null, null, null, null, null];
    }, []);

    const [photos, setPhotos] = useState(initialPhotos);
    const [uploadingIdx, setUploadingIdx] = useState(null);
    const fileInputRef = useRef(null);
    const activeIndexRef = useRef(null);

    const getUserId = () => localStorage.getItem('userId') || JSON.parse(localStorage.getItem('user') || '{}')._id;

    const savePhotosToStorage = (updatedPhotos) => {
        try {
            const hasPhotos = updatedPhotos.some(p => p !== null);
            localStorage.setItem('onboarding_photos:v1', JSON.stringify({ photos: updatedPhotos, hasPhotos }));
        } catch {
            // Ignore
        }
    };

    const handlePhotoClick = (index) => {
        activeIndexRef.current = index;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        const targetIdx = activeIndexRef.current;
        e.target.value = '';
        const userId = getUserId();

        if (!file || targetIdx === null) return;

        // Instant local preview & base64 persistence
        const localPreview = URL.createObjectURL(file);
        setPhotos((prev) => {
            const next = [...prev];
            next[targetIdx] = localPreview;
            savePhotosToStorage(next);
            return next;
        });

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result;
            setPhotos((prev) => {
                const next = [...prev];
                next[targetIdx] = base64Data;
                savePhotosToStorage(next);
                return next;
            });
        };
        reader.readAsDataURL(file);

        if (!userId) return;

        setUploadingIdx(targetIdx);
        try {
            const isProfilePicture = targetIdx === 0 || !photos[0];
            const croppedFile = await cropImageToSquare(file).catch(() => file);
            const formData = new FormData();

            if (isProfilePicture) {
                formData.append('profilePicture', croppedFile);
                const { data, ok } = await apiClient.post(`/users/${userId}/profile-picture`, formData);
                if (ok && data.success && data.user.profilePicture) {
                    setPhotos((prev) => {
                        const next = [...prev];
                        next[0] = data.user.profilePicture;
                        savePhotosToStorage(next);
                        return next;
                    });
                }
            } else {
                formData.append('galleryImages', croppedFile);
                const { data, ok } = await apiClient.post(`/users/${userId}/gallery`, formData);
                if (ok && data.success && data.user.galleryImages) {
                    const urls = data.user.galleryImages.map((g) => g.url);
                    setPhotos((prev) => {
                        const next = [...prev];
                        next[targetIdx] = urls[urls.length - 1];
                        savePhotosToStorage(next);
                        return next;
                    });
                }
            }
        } finally {
            setUploadingIdx(null);
        }
    };

    const uploadedCount = photos.filter(p => p !== null).length;
    const canContinue = uploadedCount >= 1;

    const handleContinue = () => {
        if (!canContinue) {
            alert("Please upload at least 1 photo to continue");
            return;
        }
        savePhotosToStorage(photos);
        if (returnPath) {
            navigate(returnPath, { replace: true });
        } else {
            navigate('/enable-location');
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between pt-3 pb-2 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between w-full pt-1">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => {
                        if (returnPath) {
                            navigate(returnPath, { replace: true });
                        } else {
                            navigate('/gender-select');
                        }
                    }}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-start w-full pt-1 px-2">
                {/* Header Section */}
                <div className="text-center mb-5">
                    <h2 className="text-[26px] leading-tight font-extrabold text-black mb-1 tracking-tight">
                        Add your Photos
                    </h2>
                    <p className="text-[13px] text-gray-400 font-normal">
                        Your first impression matters.
                    </p>
                </div>

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />

                {/* Photos Grid — 6 rounded square slots */}
                <div className="grid grid-cols-2 gap-3.5 w-full">
                    {photos.map((photo, idx) => (
                        <button
                            key={`photo-slot-${['a', 'b', 'c', 'd', 'e', 'f'][idx]}`}
                            type="button"
                            onClick={() => handlePhotoClick(idx)}
                            disabled={uploadingIdx === idx}
                            aria-label={`Photo slot ${idx + 1}`}
                            className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-[22px] transition-all hover:opacity-95 bg-[#F5F5F9] border border-gray-100/80 p-0 shadow-2xs group"
                        >
                            {uploadingIdx === idx ? (
                                <div className="w-8 h-8 rounded-full border-3 border-gray-300 border-t-[#6E36E4] animate-spin" />
                            ) : photo ? (
                                <img
                                    src={photo}
                                    className="w-full h-full object-cover"
                                    alt={`User upload ${idx + 1}`}
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-[#6E36E4] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer with Continue Button & Min Photo Hint */}
            <div className="w-full shrink-0 mb-1 flex flex-col items-center">
                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinue}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mb-1.5"
                >
                    Continue
                </button>

                <p className="text-[12px] text-gray-400 font-normal text-center">
                    At least 1 photo required — add up to 6 to boost your profile
                </p>
            </div>
        </div>
    );
};

export default AddPhotosPage;
