import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';

import { syncFullOnboardingData } from '../services/userApi';
import { devWarn } from '../../../shared/utils/logger';

const LOCATION_STORAGE_KEY = 'onboarding_location:v1';

const EnableLocationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const returnPath = location.state?.from;

    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);

    const saveLocationAndNext = async (locationData) => {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
        try {
            await syncFullOnboardingData();
        } catch {
            // Ignore background sync errors
        }
        if (returnPath) {
            navigate(returnPath, { replace: true });
        } else {
            navigate('/interests');
        }
    };

    const handleEnableLocation = () => {
        setLoading(true);
        setStatusMsg('Requesting permission...');
        setPermissionDenied(false);

        if (!navigator.geolocation) {
            saveLocationAndNext({ granted: false, error: 'Not supported' });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                setStatusMsg('Location enabled!');
                const { latitude, longitude } = position.coords;
                let city = '';
                let state = '';
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const res = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        const data = await res.json();
                        city = data.city || data.locality || '';
                        state = data.principalSubdivision || '';
                    }
                } catch {
                    // Ignore geocode error
                }
                saveLocationAndNext({
                    granted: true,
                    lat: latitude,
                    lng: longitude,
                    city,
                    state,
                    timestamp: Date.now()
                });
            },
            (error) => {
                devWarn('Location permission denied or unavailable:', error.message);
                setLoading(false);
                setPermissionDenied(true);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    const handleContinueWithoutLocation = () => {
        saveLocationAndNext({
            granted: false,
            skipped: true,
            timestamp: Date.now(),
        });
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
                            navigate('/add-photos');
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
            <div className="flex-1 flex flex-col justify-start w-full pt-6 px-2">
                {/* Title */}
                <h1 className="text-[26px] leading-tight font-extrabold text-black mb-2 text-center tracking-tight">
                    Enable location
                </h1>

                {/* Subtitle */}
                <p className="text-[13px] text-gray-400 text-center mb-10 leading-relaxed font-normal max-w-[290px] mx-auto">
                    Find people nearby for better matches.
                </p>

                {/* Why we need your location section */}
                <div className="w-full text-left">
                    <h2 className="text-[15px] font-bold text-gray-900 mb-4">
                        Why we need your location
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-3.5">
                            <div className="w-5.5 h-5.5 rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check size={13} strokeWidth={3.5} />
                            </div>
                            <span className="text-[15px] text-black font-semibold">Nearby matches</span>
                        </div>

                        <div className="flex items-center space-x-3.5">
                            <div className="w-5.5 h-5.5 rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check size={13} strokeWidth={3.5} />
                            </div>
                            <span className="text-[15px] text-black font-semibold">See who’s active around you</span>
                        </div>
                    </div>

                    {permissionDenied && (
                        <div className="mt-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[12.5px] leading-relaxed animate-in fade-in">
                            <p className="font-semibold mb-0.5">Location permission was not granted</p>
                            <p className="text-amber-800 text-[12px]">
                                You can continue now, or enable location anytime in your device/browser settings for accurate distance.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="w-full shrink-0 mb-8 flex flex-col items-center gap-2.5">
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

                {permissionDenied && (
                    <button
                        type="button"
                        onClick={handleContinueWithoutLocation}
                        className="w-full bg-transparent text-gray-500 hover:text-black font-semibold h-[42px] rounded-full text-[14px] transition-colors cursor-pointer"
                    >
                        Continue without location
                    </button>
                )}
            </div>
        </div>
    );
};

export default EnableLocationPage;
