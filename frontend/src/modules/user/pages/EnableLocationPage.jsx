import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Check, Navigation, Loader2 } from 'lucide-react';

import { syncFullOnboardingData } from '../services/userApi';
import { devWarn } from '../../../shared/utils/logger';

const LOCATION_STORAGE_KEY = 'onboarding_location:v1';

const EnableLocationPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const saveLocationAndNext = async (locationData) => {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
        try {
            await syncFullOnboardingData();
        } catch {
            // Ignore background sync errors
        }
        navigate('/interests');
    };

    const handleEnableLocation = () => {
        setLoading(true);
        setStatusMsg('Detecting location...');

        if (!navigator.geolocation) {
            saveLocationAndNext({ granted: false, error: 'Not supported' });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                saveLocationAndNext({
                    granted: true,
                    lat: latitude,
                    lng: longitude,
                    timestamp: Date.now()
                });
            },
            (error) => {
                devWarn('Location permission denied or unavailable:', error.message);
                saveLocationAndNext({
                    granted: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    const handleSkip = () => {
        saveLocationAndNext({ granted: false, skipped: true });
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-6 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between w-full pt-2">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate('/add-photos')}
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
                <h2 className="text-[26px] leading-tight font-extrabold text-black mb-2 text-center tracking-tight">
                    Enable location
                </h2>

                {/* Subtitle */}
                <p className="text-[13px] text-gray-400 text-center mb-10 leading-relaxed font-normal max-w-[290px] mx-auto">
                    Find people nearby for better matches.<br />
                    Find people nearby for better matches.
                </p>

                {/* Why we need your location section */}
                <div className="w-full text-left">
                    <h3 className="text-[15px] font-bold text-gray-900 mb-4">
                        Why we need your location
                    </h3>

                    <div className="space-y-3.5">
                        <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 rounded-full bg-[#555555] text-white flex items-center justify-center shrink-0">
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <span className="text-[14px] text-[#6E36E4] font-semibold">Nearby matches</span>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 rounded-full bg-[#555555] text-white flex items-center justify-center shrink-0">
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <span className="text-[14px] text-[#6E36E4] font-semibold">Trusted profiles in your area</span>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 rounded-full bg-[#555555] text-white flex items-center justify-center shrink-0">
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <span className="text-[14px] text-[#6E36E4] font-semibold">See who's active around you</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Button */}
            <div className="w-full shrink-0 mb-4 flex flex-col items-center">
                <button
                    type="button"
                    onClick={handleEnableLocation}
                    disabled={loading}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70"
                >
                    {loading ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            <span>{statusMsg || 'Getting location...'}</span>
                        </>
                    ) : (
                        <span>Enable Location</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default EnableLocationPage;
