import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Camera, Heart, User, ChevronRight } from 'lucide-react';
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

    // Read stored cover photo separately from localStorage
    const savedCover = localStorage.getItem('onboarding_cover_photo:v1') || null;
    const [coverPhoto, setCoverPhoto] = useState(savedCover);

    // Load profile and 6-gallery photos data from localStorage
    const profileData = React.useMemo(() => {
        try {
            const profile = JSON.parse(localStorage.getItem('onboarding_profile:v1') || '{}');
            const genderData = JSON.parse(localStorage.getItem('onboarding_gender:v1') || '{}');
            const interestsData = JSON.parse(localStorage.getItem('onboarding_interests:v1') || '[]');
            const goalsData = localStorage.getItem('onboarding_goals:v1') || 'Long-term Partner';

            const savedPhotos = JSON.parse(localStorage.getItem('onboarding_photos:v1') || '{}');
            const photoList = savedPhotos.photos || [];

            const name = profile.name || 'Ajay Panchal';
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
                goals: goalsData,
            };
        } catch (e) {
            devError('Error reading onboarding review data:', e);
            return {
                name: 'Ajay Panchal',
                age: 24,
                photoCount: 0,
                interestsStr: 'Photography, Cooking, Video Games',
                userGender: 'Male',
                goals: 'Long-term Partner',
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
            };
            reader.readAsDataURL(file);

            const userId = localStorage.getItem('userId') || JSON.parse(localStorage.getItem('user') || '{}')._id;
            if (userId) {
                const formData = new FormData();
                formData.append('profilePicture', file);
                await apiClient.post(`/users/${userId}/profile-picture`, formData).catch(() => {});
            }
        } catch (err) {
            devError('Error uploading cover photo:', err);
        }
    };

    const handleActivateProfile = async () => {
        try {
            localStorage.setItem('profile_complete:v1', 'true');
            localStorage.setItem('profile_complete', 'true');
            await syncFullOnboardingData();
        } catch (e) {
            devError('Error syncing profile activation:', e);
        } finally {
            navigate('/discovery');
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-4 px-5 font-sans max-w-[420px] mx-auto overflow-y-auto select-none scrollbar-none">
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

            {/* Footer Activate Button */}
            <div className="w-full shrink-0 pt-2 flex flex-col items-center">
                <button
                    type="button"
                    onClick={handleActivateProfile}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all cursor-pointer"
                >
                    Activate Profile
                </button>
                <p className="text-[12px] text-gray-400 font-normal text-center mt-1.5 mb-1">
                    You can always edit later
                </p>
            </div>
        </div>
    );
};

export default ReviewProfilePage;
