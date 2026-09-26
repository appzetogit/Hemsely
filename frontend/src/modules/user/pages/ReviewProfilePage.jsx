import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Camera, Heart, User, ChevronRight, X, Shield } from 'lucide-react';
import { syncFullOnboardingData } from '../services/userApi';
import apiClient from '../../../shared/services/apiClient';
import { devError } from '../../../shared/utils/logger';

const calculateAge = (dobString) => {
    if (!dobString) return 23;
    const parts = dobString.split('-').map(Number);
    if (parts.length < 3) return 23;
    const [year, month, day] = parts;
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = (today.getMonth() + 1) - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
        age--;
    }
    return age > 0 ? age : 23;
};

const ReviewProfilePage = () => {
    const navigate = useNavigate();
    const coverFileInputRef = useRef(null);

    // Helper to resolve initial profile / cover photo from onboarding data
    const getInitialPhoto = () => {
        try {
            // 1. Explicit cover photo
            const savedCover = localStorage.getItem('onboarding_cover_photo:v1');
            if (savedCover && typeof savedCover === 'string' && savedCover.trim()) {
                return savedCover;
            }

            // 2. Photos uploaded during onboarding in AddPhotosPage
            const savedPhotos = JSON.parse(localStorage.getItem('onboarding_photos:v1') || '{}');
            if (Array.isArray(savedPhotos.photos) && savedPhotos.photos.length > 0) {
                // Priority to slot 0 (primary profile photo)
                if (savedPhotos.photos[0] && typeof savedPhotos.photos[0] === 'string' && savedPhotos.photos[0].trim()) {
                    return savedPhotos.photos[0];
                }
                const firstValid = savedPhotos.photos.find(p => p && typeof p === 'string' && p.trim());
                if (firstValid) return firstValid;
            }

            // 3. User object in localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.profilePicture && typeof user.profilePicture === 'string') {
                return user.profilePicture;
            }
            if (Array.isArray(user.galleryImages) && user.galleryImages.length > 0) {
                const firstG = user.galleryImages[0];
                const gUrl = typeof firstG === 'string' ? firstG : firstG?.url;
                if (gUrl) return gUrl;
            }
        } catch {
            // Ignore
        }
        return null;
    };

    const [coverPhoto, setCoverPhoto] = useState(getInitialPhoto);

    // Sync cover photo on mount and fetch fresh data from server
    React.useEffect(() => {
        const localPic = getInitialPhoto();
        if (localPic && !coverPhoto) {
            setCoverPhoto(localPic);
        }

        const fetchUserData = async () => {
            try {
                const { ok, data } = await apiClient.get('/auth/me');
                if (ok && data?.user) {
                    const serverPhoto = data.user.profilePicture ||
                        (data.user.galleryImages?.length > 0
                            ? (typeof data.user.galleryImages[0] === 'string' ? data.user.galleryImages[0] : data.user.galleryImages[0]?.url)
                            : null);
                    if (serverPhoto) {
                        setCoverPhoto(serverPhoto);
                        localStorage.setItem('onboarding_cover_photo:v1', serverPhoto);
                        try {
                            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                            localUser.profilePicture = serverPhoto;
                            localStorage.setItem('user', JSON.stringify(localUser));
                        } catch {}
                    }
                }
            } catch {
                // Ignore background fetch error
            }
        };

        fetchUserData();
    }, []);

    // Load profile and 6-gallery photos data from localStorage
    const profileData = React.useMemo(() => {
        try {
            const profile = JSON.parse(localStorage.getItem('onboarding_profile:v1') || '{}');
            const genderData = JSON.parse(localStorage.getItem('onboarding_gender:v1') || '{}');
            const interestsData = JSON.parse(localStorage.getItem('onboarding_interests:v1') || '[]');
            const goalsData = localStorage.getItem('onboarding_goals:v1') || 'Long term partner';
            const normalizedGoals = goalsData.toLowerCase() === 'long term partner' ? 'Long term partner' : goalsData;

            const savedPhotos = JSON.parse(localStorage.getItem('onboarding_photos:v1') || '{}');
            const photoList = savedPhotos.photos || [];

            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const name = profile.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Ajay Panchal');
            const age = profile.dob ? calculateAge(profile.dob) : 24;
            const photoCount = photoList.filter(p => p !== null).length;
            const interestsStr = Array.isArray(interestsData) && interestsData.length > 0
                ? interestsData.slice(0, 3).join(', ')
                : 'Photography, Cooking, Video Games';

            return {
                name,
                age,
                photoCount,
                interestsStr,
                userGender: genderData.userGender || 'Male',
                goals: normalizedGoals,
            };
        } catch (e) {
            devError('Error reading onboarding review data:', e);
            return {
                name: 'Ajay Panchal',
                age: 24,
                photoCount: 0,
                interestsStr: 'Photography, Cooking, Video Games',
                userGender: 'Male',
                goals: 'Long term partner',
            };
        }
    }, []);

    const handleCoverFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const localUrl = URL.createObjectURL(file);
        setCoverPhoto(localUrl);
        localStorage.setItem('onboarding_cover_photo:v1', localUrl);

        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result;
                setCoverPhoto(base64Data);
                localStorage.setItem('onboarding_cover_photo:v1', base64Data);
                try {
                    const pData = JSON.parse(localStorage.getItem('onboarding_photos:v1') || '{}');
                    const currentPhotos = Array.isArray(pData.photos) ? [...pData.photos] : [null, null, null, null, null, null];
                    currentPhotos[0] = base64Data;
                    localStorage.setItem('onboarding_photos:v1', JSON.stringify({ photos: currentPhotos, hasPhotos: true }));
                } catch {}
            };
            reader.readAsDataURL(file);

            const userId = localStorage.getItem('userId') || JSON.parse(localStorage.getItem('user') || '{}')._id;
            if (userId) {
                const formData = new FormData();
                formData.append('profilePicture', file);
                const { data, ok } = await apiClient.post(`/users/${userId}/profile-picture`, formData).catch(() => ({}));
                if (ok && data?.success && data?.user?.profilePicture) {
                    const picUrl = data.user.profilePicture;
                    setCoverPhoto(picUrl);
                    localStorage.setItem('onboarding_cover_photo:v1', picUrl);
                    try {
                        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                        localUser.profilePicture = picUrl;
                        localStorage.setItem('user', JSON.stringify(localUser));

                        const pData = JSON.parse(localStorage.getItem('onboarding_photos:v1') || '{}');
                        const currentPhotos = Array.isArray(pData.photos) ? [...pData.photos] : [null, null, null, null, null, null];
                        currentPhotos[0] = picUrl;
                        localStorage.setItem('onboarding_photos:v1', JSON.stringify({ photos: currentPhotos, hasPhotos: true }));
                    } catch {}
                }
            }
        } catch (err) {
            devError('Error uploading cover photo:', err);
        }
    };

    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [privacyContent, setPrivacyContent] = useState(null);
    const [loadingPrivacy, setLoadingPrivacy] = useState(false);

    // Fetch privacy policy content when in-screen modal is opened
    React.useEffect(() => {
        if (showPrivacyModal && !privacyContent) {
            setLoadingPrivacy(true);
            apiClient.get('/pages/privacy-policy')
                .then(({ data, ok }) => {
                    if (ok && data?.success && data?.page) {
                        setPrivacyContent(data.page);
                    } else {
                        setPrivacyContent({
                            title: 'Privacy Policy',
                            summary: 'Your privacy is essential to us at Hemsely.',
                            body: '<p>Hemsely respects your privacy and is committed to protecting your personal data. We collect only the information necessary to provide our matchmaking services, enhance security, and maintain a safe platform for all members.</p><p class="mt-3">By activating your profile, you consent to our data collection and handling practices as described in this policy.</p>'
                        });
                    }
                    setLoadingPrivacy(false);
                })
                .catch(() => {
                    setPrivacyContent({
                        title: 'Privacy Policy',
                        summary: 'Your privacy is essential to us at Hemsely.',
                        body: '<p>Hemsely respects your privacy and is committed to protecting your personal data. We collect only the information necessary to provide our matchmaking services, enhance security, and maintain a safe platform for all members.</p><p class="mt-3">By activating your profile, you consent to our data collection and handling practices as described in this policy.</p>'
                    });
                    setLoadingPrivacy(false);
                });
        }
    }, [showPrivacyModal, privacyContent]);

    const handleActivateProfile = async () => {
        if (!acceptedPrivacy || isActivating) return;
        setIsActivating(true);
        try {
            localStorage.setItem('profile_complete:v1', 'true');
            localStorage.setItem('profile_complete', 'true');
            localStorage.setItem('privacy_policy_accepted:v1', 'true');
            await syncFullOnboardingData();
        } catch (e) {
            devError('Error syncing profile activation:', e);
        } finally {
            setIsActivating(false);
            navigate('/discovery');
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-4 px-5 font-sans max-w-[420px] mx-auto overflow-y-auto select-none scrollbar-none relative">
            {/* Hidden File Input for Independent Cover Photo Upload */}
            <input
                type="file"
                ref={coverFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCoverFileChange}
            />

            {/* Header Section */}
            <div className="text-center pt-1 mb-3 shrink-0">
                <h2 className="text-[26px] leading-tight font-extrabold text-black mb-0.5 tracking-tight">
                    Review your profile
                </h2>
                <p className="text-[13px] text-gray-400 font-normal">
                    Make a great first impression
                </p>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto pb-2 scrollbar-none">
                {/* 1. Independent Cover Photo Card */}
                <div
                    onClick={() => coverFileInputRef.current?.click()}
                    className="relative w-full h-[165px] rounded-[24px] overflow-hidden shadow-xs shrink-0 group bg-[#F4ECFF] cursor-pointer"
                >
                    {coverPhoto ? (
                        <img
                            src={coverPhoto}
                            alt={profileData.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#F4ECFF] via-[#ECE0FC] to-[#E3D0FA] flex flex-col items-center justify-center text-[#6E36E4]">
                            <Camera size={34} className="mb-1.5 opacity-80" />
                            <span className="text-[12.5px] font-extrabold text-[#6E36E4] tracking-tight">
                                Add Profile Photo
                            </span>
                        </div>
                    )}

                    {/* Pencil Edit Icon */}
                    <button
                        type="button"
                        aria-label="Edit cover photo"
                        onClick={(e) => {
                            e.stopPropagation();
                            coverFileInputRef.current?.click();
                        }}
                        className="absolute top-3 right-3 w-7.5 h-7.5 rounded-full bg-white/50 backdrop-blur-md flex items-center justify-center text-gray-900 hover:bg-white/80 transition-colors border border-white/60 cursor-pointer shadow-xs z-10"
                    >
                        <Pencil size={14} className="text-gray-900" />
                    </button>

                    {/* Gradient Overlay & Name */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 flex flex-col justify-end text-white">
                        <h3 className="text-[19px] font-extrabold leading-snug tracking-tight text-white">
                            {profileData.name}, {profileData.age}
                        </h3>
                        <p className="text-[11.5px] text-gray-200 font-normal mt-0.5">
                            Professional model
                        </p>
                    </div>
                </div>

                {/* 2. Photos Card */}
                <div className="w-full bg-white border border-gray-100/80 rounded-[20px] p-3 flex items-center justify-between shadow-2xs shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#F3EAFF] flex items-center justify-center shrink-0 text-[#6E36E4]">
                            <Camera size={18} />
                        </div>
                        <div>
                            <h4 className="text-[13.5px] font-bold text-gray-900 leading-tight">Photos</h4>
                            <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                                {profileData.photoCount} Photos added
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/add-photos', { state: { from: '/review-profile' } })}
                        className="bg-[#6E36E4] hover:bg-[#5e2cd6] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center space-x-0.5 cursor-pointer transition-colors"
                    >
                        <span>Edit</span>
                        <ChevronRight size={13} />
                    </button>
                </div>

                {/* 3. Interests Card */}
                <div className="w-full bg-white border border-gray-100/80 rounded-[20px] p-3 flex items-center justify-between shadow-2xs shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#F3EAFF] flex items-center justify-center shrink-0 text-[#6E36E4]">
                            <Heart size={18} />
                        </div>
                        <div>
                            <h4 className="text-[13.5px] font-bold text-gray-900 leading-tight">Interests</h4>
                            <p className="text-[11px] text-gray-400 font-normal mt-0.5 truncate max-w-[140px]">
                                {profileData.interestsStr}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/interests', { state: { from: '/review-profile' } })}
                        className="bg-[#6E36E4] hover:bg-[#5e2cd6] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center space-x-0.5 cursor-pointer transition-colors"
                    >
                        <span>Edit</span>
                        <ChevronRight size={13} />
                    </button>
                </div>

                {/* 4. Basics Card */}
                <div className="w-full bg-white border border-gray-100/80 rounded-[20px] p-3 flex items-center justify-between shadow-2xs shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#F3EAFF] flex items-center justify-center shrink-0 text-[#6E36E4]">
                            <User size={18} />
                        </div>
                        <div>
                            <h4 className="text-[13.5px] font-bold text-gray-900 leading-tight">Basics</h4>
                            <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                                Gender , Relationship Goals
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/gender-select', { state: { from: '/review-profile' } })}
                        className="bg-[#6E36E4] hover:bg-[#5e2cd6] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center space-x-0.5 cursor-pointer transition-colors"
                    >
                        <span>Edit</span>
                        <ChevronRight size={13} />
                    </button>
                </div>
            </div>

            {/* Footer with Privacy Policy Acceptance & Activate Button */}
            <div className="w-full shrink-0 mb-8 flex flex-col items-center">
                {/* Acceptance Checkbox & Privacy Policy Link */}
                <label className="flex items-center gap-2.5 mb-3.5 cursor-pointer select-none text-[13px] text-gray-600 px-1 hover:text-gray-900 transition-colors">
                    <input
                        type="checkbox"
                        id="privacy-policy-acceptance"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-gray-300 text-[#6E36E4] focus:ring-[#6E36E4] accent-[#6E36E4] cursor-pointer shrink-0"
                    />
                    <span className="leading-snug">
                        I accept the{' '}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowPrivacyModal(true);
                            }}
                            className="text-[#6E36E4] font-semibold underline hover:text-[#5e2cd6] cursor-pointer inline bg-transparent border-none p-0"
                        >
                            Privacy Policy
                        </button>
                    </span>
                </label>

                <button
                    type="button"
                    disabled={!acceptedPrivacy || isActivating}
                    onClick={handleActivateProfile}
                    aria-label="Continue and Activate Profile"
                    className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isActivating ? 'Activating...' : 'Activate Profile'}
                </button>
                <p className="text-[12px] text-gray-400 font-normal text-center mt-1.5 mb-1">
                    You can always edit later
                </p>
            </div>

            {/* Full-Page In-Screen Privacy Policy View */}
            {showPrivacyModal && (
                <div
                    className="absolute inset-0 z-50 bg-white flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-150"
                >
                    {/* Full-Page Header */}
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center shrink-0 bg-white">
                        <div className="flex items-center space-x-2.5">
                            <button
                                type="button"
                                aria-label="Go back"
                                onClick={() => setShowPrivacyModal(false)}
                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer mr-1"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                            </button>
                            <div className="w-7 h-7 rounded-full bg-[#F3EAFF] flex items-center justify-center text-[#6E36E4] shrink-0">
                                <Shield size={15} />
                            </div>
                            <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">
                                {privacyContent?.title || 'Privacy Policy'}
                            </h3>
                        </div>
                    </div>

                    {/* Full-Page Scrollable Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 text-gray-700 font-sans leading-relaxed text-[14px]">
                        {loadingPrivacy ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <div className="w-8 h-8 rounded-full border-3 border-gray-200 border-t-[#6E36E4] animate-spin mb-3" />
                                <p className="text-xs font-medium">Loading Privacy Policy...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {privacyContent?.summary && (
                                    <div className="p-3.5 bg-[#FAF8FF] border border-[#E9DFFC] rounded-2xl text-[13px] font-medium text-[#5E2CD6]">
                                        {privacyContent.summary}
                                    </div>
                                )}
                                {privacyContent?.body ? (
                                    <div
                                        className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-3"
                                        dangerouslySetInnerHTML={{ __html: privacyContent.body }}
                                    />
                                ) : (
                                    <p className="text-gray-500 text-sm">
                                        No privacy policy content published yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Full-Page Footer Actions */}
                    <div className="p-4 border-t border-gray-100 bg-white flex gap-3 shrink-0 mb-3">
                        <button
                            type="button"
                            onClick={() => setShowPrivacyModal(false)}
                            className="flex-1 h-[48px] rounded-full border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 text-[15px] transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAcceptedPrivacy(true);
                                setShowPrivacyModal(false);
                            }}
                            className="flex-1 h-[48px] rounded-full bg-[#6E36E4] hover:bg-[#5e2cd6] font-bold text-white text-[15px] shadow-sm transition-all cursor-pointer"
                        >
                            I Accept
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewProfilePage;
