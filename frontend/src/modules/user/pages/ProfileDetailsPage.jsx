import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { syncFullOnboardingData } from '../services/userApi';

const PROFILE_STORAGE_KEY = 'onboarding_profile:v1';

// Calculate max DOB (must be at least 18 years old)
const today = new Date();
const maxYear = today.getFullYear() - 18;
const maxMonth = String(today.getMonth() + 1).padStart(2, '0');
const maxDay = String(today.getDate()).padStart(2, '0');
const maxDobDate = `${maxYear}-${maxMonth}-${maxDay}`;
const minDobDate = `${maxYear - 80}-01-01`;

const ProfileDetailsPage = () => {
    const navigate = useNavigate();
    const savedProfile = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }, []);

    const [name, setName] = useState(savedProfile.name || '');
    const [dob, setDob] = useState(savedProfile.dob || '');
    const dateInputRef = useRef(null);

    const handleContinue = async () => {
        if (!name || !dob) {
            alert("Please enter your name and date of birth");
            return;
        }
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name: name.trim(), dob }));
        try {
            await syncFullOnboardingData();
        } catch {
            // Ignore background sync errors
        }
        navigate('/gender-select');
    };

    const handleContainerClick = () => {
        if (dateInputRef.current) {
            if (typeof dateInputRef.current.showPicker === 'function') {
                dateInputRef.current.showPicker();
            } else {
                dateInputRef.current.focus();
            }
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-6 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between w-full pt-2">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate('/verify')}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
            </div>

            {/* Main Content Area - Aligned to top */}
            <div className="flex-1 flex flex-col justify-start w-full pt-6 px-2">
                {/* Title */}
                <h2 className="text-[28px] leading-tight font-extrabold text-black mb-1.5 text-center tracking-tight">
                    Profile Details
                </h2>

                {/* Subtitle */}
                <p className="text-[14px] text-gray-400 text-center mb-8 font-normal">
                    Fill up the following details
                </p>

                {/* Form Fields */}
                <div className="w-full space-y-4">
                    {/* Name Field */}
                    <div>
                        <label htmlFor="first-name" className="text-[13px] font-semibold text-[#6E36E4] mb-1.5 block ml-3">
                            Name
                        </label>
                        <div className="w-full h-[52px] border-[1.5px] border-[#6E36E4] rounded-full flex items-center px-6 bg-white shadow-xs transition-colors focus-within:border-[#6E36E4]">
                            <input
                                id="first-name"
                                type="text"
                                aria-label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-transparent border-none outline-none text-[16px] font-medium text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* DOB Field */}
                    <div>
                        <div
                            onClick={handleContainerClick}
                            className={`relative w-full h-[52px] border-[1.5px] ${dob ? 'border-[#6E36E4]' : 'border-[#B89CF5]'} rounded-full flex items-center px-6 justify-between bg-white shadow-xs cursor-pointer transition-colors hover:border-[#6E36E4] focus-within:border-[#6E36E4]`}
                        >
                            <input
                                ref={dateInputRef}
                                id="dob"
                                type="date"
                                aria-label="Date of birth"
                                max={maxDobDate}
                                min={minDobDate}
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                className={`custom-date-input w-full bg-transparent border-none outline-none text-[16px] font-medium cursor-pointer font-sans [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:appearance-none ${!dob ? 'empty-date-input text-transparent' : 'text-gray-900'}`}
                            />
                            {!dob && (
                                <span className="absolute left-6 pointer-events-none text-[15px] font-medium text-[#9CA3AF]">
                                    DOB
                                </span>
                            )}
                            <div className="text-[#9CA3AF] pointer-events-none shrink-0 ml-2">
                                <Calendar size={20} className="text-[#9CA3AF]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Continue Button */}
            <div className="w-full shrink-0 mb-4">
                <button
                    type="button"
                    disabled={!name || !dob}
                    onClick={handleContinue}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[54px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default ProfileDetailsPage;
