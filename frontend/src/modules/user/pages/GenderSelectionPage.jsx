import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { syncFullOnboardingData } from '../services/userApi';

const GENDER_STORAGE_KEY = 'onboarding_gender:v1';

// Reusable Gender Button Component (Capsule Pill matching reference UI exactly)
const GenderButton = ({ label, isSelected, onClick }) => {
    const isMale = label === 'Male';
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSelected}
            className={`flex-1 flex items-center px-1.5 h-[50px] rounded-full transition-all cursor-pointer ${
                isSelected
                    ? 'bg-[#F3EAFF] border-none shadow-2xs'
                    : 'bg-[#FBF8FF] border-[1.5px] border-[#C7B5FB] hover:border-[#6E36E4]'
            }`}
        >
            {/* Solid Purple Circle with White Person Icon */}
            <div className="w-8 h-8 rounded-full bg-[#6E36E4] flex items-center justify-center shrink-0 text-white ml-1">
                {isMale ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM9.5 8a2 2 0 00-2 2v5a1 1 0 001 1h1v6a1 1 0 001 1h3a1 1 0 001-1v-6h1a1 1 0 001-1v-5a2 2 0 00-2-2h-5z" />
                    </svg>
                ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8.5 8a2 2 0 00-2 2v4a1 1 0 001 1h1v7a1 1 0 001 1h7a1 1 0 001-1v-7h1a1 1 0 001-1v-4a2 2 0 00-2-2h-7z" />
                    </svg>
                )}
            </div>

            <span className="flex-1 text-center text-[14px] font-semibold text-gray-900 pr-2">
                {label}
            </span>
        </button>
    );
};

const GenderSelectionPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const returnPath = location.state?.from;

    const savedGenderData = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem(GENDER_STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }, []);

    const [userGender, setUserGender] = useState(savedGenderData.userGender || 'Male');
    const [interestedIn, setInterestedIn] = useState(
        Array.isArray(savedGenderData.interestedIn) && savedGenderData.interestedIn.length > 0
            ? savedGenderData.interestedIn
            : ['Female']
    );

    const toggleInterest = (gender) => {
        if (interestedIn.includes(gender)) {
            if (interestedIn.length > 1) {
                setInterestedIn(interestedIn.filter(g => g !== gender));
            }
        } else {
            setInterestedIn([...interestedIn, gender]);
        }
    };

    const handleContinue = async () => {
        if (!userGender || interestedIn.length === 0) {
            alert("Please select your gender and who you are interested in.");
            return;
        }
        localStorage.setItem(GENDER_STORAGE_KEY, JSON.stringify({ userGender, interestedIn }));
        try {
            await syncFullOnboardingData();
        } catch {
            // Ignore background sync errors
        }
        if (returnPath) {
            navigate(returnPath, { replace: true });
        } else {
            navigate('/add-photos');
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-6 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between w-full pt-2">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => {
                        if (returnPath) {
                            navigate(returnPath, { replace: true });
                        } else {
                            navigate('/profile-details');
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

            {/* Main Content Area - Aligned to top */}
            <div className="flex-1 flex flex-col justify-start w-full pt-4 px-2">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h2 className="text-[26px] leading-tight font-extrabold text-black mb-1.5 tracking-tight">
                        Tell us who you are
                    </h2>
                    <p className="text-[13px] text-gray-400 font-normal">
                        This helps personalize your matches
                    </p>
                </div>

                {/* Section 1: Your Gender */}
                <div className="mb-7 w-full">
                    <h3 className="text-[14px] font-bold text-gray-900 mb-0.5">Your Gender</h3>
                    <p className="text-[11px] text-gray-400 font-normal mb-3">Select the options that best describe you</p>
                    <div className="flex space-x-3">
                        <GenderButton
                            label="Male"
                            isSelected={userGender === 'Male'}
                            onClick={() => setUserGender('Male')}
                        />
                        <GenderButton
                            label="Female"
                            isSelected={userGender === 'Female'}
                            onClick={() => setUserGender('Female')}
                        />
                    </div>
                </div>

                {/* Section 2: Interest */}
                <div className="mb-6 w-full">
                    <h3 className="text-[14px] font-bold text-gray-900 mb-0.5">Who are you interested in?</h3>
                    <p className="text-[11px] text-gray-400 font-normal mb-3">Select one or more</p>
                    <div className="flex space-x-3">
                        <GenderButton
                            label="Male"
                            isSelected={interestedIn.includes('Male')}
                            onClick={() => toggleInterest('Male')}
                        />
                        <GenderButton
                            label="Female"
                            isSelected={interestedIn.includes('Female')}
                            onClick={() => toggleInterest('Female')}
                        />
                    </div>
                </div>
            </div>

            {/* Continue Button */}
            <div className="w-full shrink-0 mb-4">
                <button
                    type="button"
                    disabled={!userGender || interestedIn.length === 0}
                    onClick={handleContinue}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default GenderSelectionPage;
