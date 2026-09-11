import React, { useState, useEffect } from 'react';

const RELATIONSHIP_GOALS = [
    { label: 'Long Term', value: 'Long Term' },
    { label: 'Casual', value: 'Casual' }
];

const RELIGION_OPTIONS = [
    { label: 'Hindu', value: 'Hindu' },
    { label: 'Muslim', value: 'Muslim' },
    { label: 'Christian', value: 'Christian' },
    { label: 'Sikh', value: 'Sikh' },
    { label: 'Jain', value: 'Jain' },
    { label: 'Atheist', value: 'Atheist' }
];

const EDUCATION_OPTIONS = [
    { label: 'High School', value: 'High School' },
    { label: 'Undergraduate', value: 'Undergraduate' },
    { label: 'Graduate', value: 'Graduate' },
    { label: 'Post Graduate', value: 'Post Graduate' }
];

const HABIT_OPTIONS = [
    { label: 'No', value: 'No' },
    { label: 'Yes', value: 'Yes' },
    { label: 'Occasionally', value: 'Occasionally' },
    { label: 'Socially', value: 'Socially' }
];

const DiscoveryFilterPopup = ({
    appliedFilters = {},
    onApply,
    onClose,
    onUnlockPremium,
    isPremium = false
}) => {
    const [activeTab, setActiveTab] = useState('basic');

    // Basic Filter State
    const [interest, setInterest] = useState(() => appliedFilters?.interestedIn || 'Both');
    const [distanceKm, setDistanceKm] = useState(() => appliedFilters?.distanceKm ?? 100);
    const [minAge, setMinAge] = useState(() => appliedFilters?.minAge ?? 18);
    const [maxAge, setMaxAge] = useState(() => appliedFilters?.maxAge ?? 60);

    // Location State - dynamically detect user's live location & stored city
    const defaultUserCity = (() => {
        try {
            const onboardingLoc = JSON.parse(localStorage.getItem('onboarding_location:v1') || '{}');
            if (onboardingLoc.city && onboardingLoc.state) {
                return `${onboardingLoc.city}, ${onboardingLoc.state}`;
            }
            if (onboardingLoc.city) return onboardingLoc.city;

            const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            if (u?.location?.city && u?.location?.state) {
                return `${u.location.city}, ${u.location.state}`;
            }
            if (u?.location?.city) return u.location.city;
            if (u?.location?.address) return u.location.address;
        } catch {
            // fallback
        }
        return 'Current Location';
    })();

    const [locationName, setLocationName] = useState(() => appliedFilters?.locationName || defaultUserCity);
    const [selectedCoords, setSelectedCoords] = useState(() => {
        try {
            const onboardingLoc = JSON.parse(localStorage.getItem('onboarding_location:v1') || '{}');
            return {
                lat: appliedFilters?.lat || onboardingLoc?.lat || null,
                lng: appliedFilters?.lng || onboardingLoc?.lng || null,
            };
        } catch {
            return {
                lat: appliedFilters?.lat || null,
                lng: appliedFilters?.lng || null,
            };
        }
    });
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Dynamic real-time city search without any mock data
    useEffect(() => {
        if (!citySearchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citySearchQuery.trim())}&count=10&language=en&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.results && Array.isArray(data.results)) {
                        const formatted = data.results.map((r) => {
                            const nameParts = [r.name];
                            if (r.admin1 && r.admin1 !== r.name) nameParts.push(r.admin1);
                            if (r.country) nameParts.push(r.country);
                            return {
                                name: nameParts.join(', '),
                                lat: r.latitude,
                                lng: r.longitude,
                            };
                        });
                        setSearchResults(formatted);
                    } else {
                        setSearchResults([]);
                    }
                }
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [citySearchQuery]);

    // Fetch live location in background if not already specified with custom city
    useEffect(() => {
        if ((!appliedFilters?.locationName || appliedFilters.locationName === 'Current Location' || appliedFilters.locationName === 'Mumbai, India') && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                setSelectedCoords({ lat: latitude, lng: longitude });
                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    if (res.ok) {
                        const data = await res.json();
                        const detectedCity = data.city || data.locality || '';
                        const detectedState = data.principalSubdivision || '';
                        if (detectedCity) {
                            const fullLoc = detectedState ? `${detectedCity}, ${detectedState}` : detectedCity;
                            setLocationName(fullLoc);
                            try {
                                const prevLoc = JSON.parse(localStorage.getItem('onboarding_location:v1') || '{}');
                                localStorage.setItem('onboarding_location:v1', JSON.stringify({
                                    ...prevLoc,
                                    lat: latitude,
                                    lng: longitude,
                                    city: detectedCity,
                                    state: detectedState,
                                    granted: true
                                }));
                            } catch {}
                        }
                    }
                } catch {
                    setLocationName('Current Location');
                }
            }, () => {
                // Ignore or keep default
            }, { timeout: 8000, enableHighAccuracy: true });
        }
    }, [appliedFilters?.locationName]);

    // Advanced Filter State (defaults to unselected)
    const [relationshipGoal, setRelationshipGoal] = useState(() => (!appliedFilters?.relationshipGoal || appliedFilters?.relationshipGoal === 'any' ? '' : appliedFilters.relationshipGoal));
    const [religion, setReligion] = useState(() => (!appliedFilters?.religion || appliedFilters?.religion === 'any' ? '' : appliedFilters.religion));
    const [education, setEducation] = useState(() => (!appliedFilters?.education || appliedFilters?.education === 'any' ? '' : appliedFilters.education));
    const [drinkingStatus, setDrinkingStatus] = useState(() => (!appliedFilters?.drinkingStatus || appliedFilters?.drinkingStatus === 'any' ? '' : appliedFilters.drinkingStatus));
    const [smokingStatus, setSmokingStatus] = useState(() => (!appliedFilters?.smokingStatus || appliedFilters?.smokingStatus === 'any' ? '' : appliedFilters.smokingStatus));

    const handleApply = () => {
        const filters = {
            interestedIn: interest,
            distanceKm,
            minAge,
            maxAge,
            locationName,
            lat: selectedCoords.lat,
            lng: selectedCoords.lng,
            relationshipGoal,
            religion,
            education,
            drinkingStatus,
            smokingStatus
        };
        onApply?.(filters);
        onClose?.();
    };

    const handleSelectCity = (cityObj) => {
        setLocationName(cityObj.name);
        setSelectedCoords({ lat: cityObj.lat, lng: cityObj.lng });
        setShowLocationPicker(false);
    };

    const handleUseCurrentGps = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                setSelectedCoords({ lat: latitude, lng: longitude });
                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    if (res.ok) {
                        const data = await res.json();
                        const city = data.city || data.locality || '';
                        const state = data.principalSubdivision || '';
                        if (city) {
                            setLocationName(state ? `${city}, ${state}` : city);
                            setShowLocationPicker(false);
                            return;
                        }
                    }
                } catch {}
                setLocationName('Current Location');
                setShowLocationPicker(false);
            }, () => {
                setLocationName('Current Location');
                setShowLocationPicker(false);
            }, { timeout: 8000, enableHighAccuracy: true });
        } else {
            setShowLocationPicker(false);
        }
    };


    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end pointer-events-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Backdrop Button */}
            <button
                type="button"
                aria-label="Close filter modal backdrop"
                className="fixed inset-0 border-0 cursor-default"
                onClick={onClose}
            />

            {/* Modal Sheet - Full width edge to edge */}
            <div className="w-full bg-white rounded-t-[32px] shadow-2xl p-5 overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[88vh]">

                {/* Top Drag Handle */}
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />

                {/* Header Tabs matching exact design */}
                <div className="w-full h-11 bg-gray-100 p-1 rounded-full flex items-center mb-5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-1.5 rounded-full text-[14px] font-extrabold transition-all cursor-pointer border-0 ${activeTab === 'basic'
                                ? 'bg-[#733FE0] text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        Basic Filter
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('advance')}
                        className={`flex-1 py-1.5 rounded-full text-[14px] font-extrabold transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${activeTab === 'advance'
                                ? 'bg-[#733FE0] text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        <span>Advance Filter</span>
                        {!isPremium && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-1 space-y-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {activeTab === 'basic' ? (
                        <>
                            {/* Interested In */}
                            <div>
                                <h3 className="text-[15px] font-bold text-gray-900 mb-3">
                                    Interested in
                                </h3>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {['Male', 'Female', 'Both'].map(type => {
                                        const isSelected = interest.toLowerCase() === type.toLowerCase();
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setInterest(type)}
                                                className={`h-[42px] rounded-full text-[14px] font-bold transition-all cursor-pointer border ${isSelected
                                                        ? 'bg-[#733FE0] text-white border-[#733FE0] shadow-xs'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Distance Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-[15px] font-bold text-gray-900">
                                        Maximum Distance
                                    </h3>
                                    <span className="text-[13.5px] font-extrabold text-[#733FE0] bg-purple-50 px-3 py-0.5 rounded-full border border-purple-100">
                                        {distanceKm} km
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="100"
                                    value={distanceKm}
                                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#733FE0]"
                                />
                            </div>

                            {/* Age Range Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-[15px] font-bold text-gray-900">
                                        Age Range
                                    </h3>
                                    <span className="text-[13.5px] font-extrabold text-[#733FE0] bg-purple-50 px-3 py-0.5 rounded-full border border-purple-100">
                                        {minAge} - {maxAge} yrs
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3.5">
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[12px] font-semibold text-gray-500">Minimum Age</span>
                                            <span className="text-[12px] font-bold text-gray-800">{minAge} yrs</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="18"
                                            max="60"
                                            value={minAge}
                                            onChange={(e) => {
                                                const val = Math.min(Number(e.target.value), maxAge - 1);
                                                setMinAge(val);
                                            }}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#733FE0]"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[12px] font-semibold text-gray-500">Maximum Age</span>
                                            <span className="text-[12px] font-bold text-gray-800">{maxAge} yrs</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="19"
                                            max="60"
                                            value={maxAge}
                                            onChange={(e) => {
                                                const val = Math.max(Number(e.target.value), minAge + 1);
                                                setMaxAge(val);
                                            }}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#733FE0]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Advance Filter Tab */
                        <div className="space-y-5">
                            {/* Status Banner */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-[15px] font-bold text-gray-900">
                                    Advanced Matching Criteria
                                </h3>
                                {isPremium ? (
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                                        <span>PRO UNLOCKED</span>
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>
                                        PRO LOCKED
                                    </span>
                                )}
                            </div>

                            {!isPremium ? (
                                /* Non-Premium Locked View matching exact screenshot layout */
                                <div className="space-y-3">
                                    {[
                                        { text: 'Location change & Passport search', check: true },
                                        { text: 'Long Term relationship goals', check: true },
                                        { text: 'Religious & cultural beliefs', check: true },
                                        { text: 'Education level & Career', check: true },
                                        { text: 'Drinking & Smoking habits', check: true }
                                    ].map((item) => (
                                        <div
                                            key={`locked-${item.text}`}
                                            onClick={onUnlockPremium}
                                            className="w-full h-[50px] bg-white rounded-2xl px-4 flex items-center justify-between border border-gray-100 shadow-xs cursor-pointer hover:border-purple-200 transition-all"
                                        >
                                            <span className="text-[13.5px] font-bold text-gray-900">
                                                {item.text}
                                            </span>
                                            <span className="text-emerald-500 font-bold text-[15px]">✓</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Premium Unlocked Interactive View */
                                <div className="space-y-5">
                                    {/* 1. Location / Passport */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Location
                                        </label>
                                        <div
                                            onClick={() => setShowLocationPicker(true)}
                                            className="h-[48px] bg-gray-50/90 border border-gray-200/80 rounded-2xl px-4 flex items-center justify-between text-gray-900 cursor-pointer hover:border-purple-300 active:scale-[0.99] transition-all"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#733FE0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <span className="text-[14px] font-bold text-gray-800">{locationName}</span>
                                            </div>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </div>
                                    </div>
                                    {/* 2. Relationship Goals */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Relationship Goals
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {RELATIONSHIP_GOALS.map((opt) => {
                                                const isSel = Boolean(relationshipGoal && relationshipGoal.toLowerCase() === opt.value.toLowerCase());
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setRelationshipGoal(prev => (prev && prev.toLowerCase() === opt.value.toLowerCase() ? '' : opt.value))}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${isSel
                                                                ? 'bg-[#733FE0] text-white border-[#733FE0] shadow-xs'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. Religious & Cultural Beliefs */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Religious & Cultural Beliefs
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {RELIGION_OPTIONS.map((opt) => {
                                                const isSel = Boolean(religion && religion.toLowerCase() === opt.value.toLowerCase());
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setReligion(prev => (prev && prev.toLowerCase() === opt.value.toLowerCase() ? '' : opt.value))}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${isSel
                                                                ? 'bg-[#733FE0] text-white border-[#733FE0] shadow-xs'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 4. Education Level */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Education Level
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {EDUCATION_OPTIONS.map((opt) => {
                                                const isSel = Boolean(education && education.toLowerCase() === opt.value.toLowerCase());
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setEducation(prev => (prev && prev.toLowerCase() === opt.value.toLowerCase() ? '' : opt.value))}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${isSel
                                                                ? 'bg-[#733FE0] text-white border-[#733FE0] shadow-xs'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 5. Drinking Habits */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Drinking Habits
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {HABIT_OPTIONS.map((opt) => {
                                                const isSel = Boolean(drinkingStatus && drinkingStatus.toLowerCase() === opt.value.toLowerCase());
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setDrinkingStatus(prev => (prev && prev.toLowerCase() === opt.value.toLowerCase() ? '' : opt.value))}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${isSel
                                                                ? 'bg-[#733FE0] text-white border-[#733FE0] shadow-xs'
                                                                : 'bg-[#FCFCFC] text-gray-700 border-gray-200 hover:border-purple-300'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 6. Smoking Habits */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Smoking Habits
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {HABIT_OPTIONS.map((opt) => {
                                                const isSel = Boolean(smokingStatus && smokingStatus.toLowerCase() === opt.value.toLowerCase());
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setSmokingStatus(prev => (prev && prev.toLowerCase() === opt.value.toLowerCase() ? '' : opt.value))}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${isSel
                                                                ? 'bg-[#733FE0] text-white border-[#733FE0] shadow-xs'
                                                                : 'bg-[#FCFCFC] text-gray-700 border-gray-200 hover:border-purple-300'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-3 pb-6 shrink-0">
                    {activeTab === 'advance' && !isPremium ? (
                        <button
                            type="button"
                            onClick={onUnlockPremium}
                            className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#733FE0] to-[#8C52FF] hover:from-[#6232c7] hover:to-[#783ffd] text-white font-extrabold text-[14.5px] shadow-md shadow-purple-200 active:scale-[0.98] transition-all cursor-pointer border-0 tracking-wide uppercase"
                        >
                            Unlock Premium Filters
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleApply}
                            className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#733FE0] to-[#8C52FF] hover:from-[#6232c7] hover:to-[#783ffd] text-white font-extrabold text-[14.5px] shadow-md shadow-purple-200 active:scale-[0.98] transition-all cursor-pointer border-0 tracking-wide uppercase"
                        >
                            Apply Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Location Picker Sub-Modal */}
            {showLocationPicker && (
                <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full bg-white rounded-t-[32px] shadow-2xl p-5 overflow-hidden flex flex-col relative max-h-[80vh]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[17px] font-bold text-gray-900">Select Location</h3>
                            <button
                                type="button"
                                onClick={() => setShowLocationPicker(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold border-0 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* City Search Bar */}
                        <div className="mb-4 relative">
                            <input
                                type="text"
                                value={citySearchQuery}
                                onChange={(e) => setCitySearchQuery(e.target.value)}
                                placeholder="Search city..."
                                className="w-full h-[44px] bg-gray-100 rounded-xl px-4 text-[14px] text-gray-800 outline-none border border-transparent focus:border-[#733FE0]"
                            />
                        </div>

                        {/* Use Current GPS Location option */}
                        <button
                            type="button"
                            onClick={handleUseCurrentGps}
                            className="w-full h-[46px] bg-purple-50 text-[#733FE0] font-bold text-[14px] rounded-xl mb-4 flex items-center justify-center gap-2 border border-purple-100 active:scale-[0.99] transition-all cursor-pointer"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="3 11 22 2 13 21 11 13 3 11" />
                            </svg>
                            Use Current Device GPS
                        </button>

                        {/* City List (Live Search) */}
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {searching ? (
                                <div className="py-8 text-center text-gray-400 font-semibold text-[13px]">
                                    Searching cities...
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((c, idx) => (
                                    <button
                                        key={`${c.name}-${idx}`}
                                        type="button"
                                        onClick={() => handleSelectCity(c)}
                                        className={`w-full py-3 px-4 rounded-xl text-left text-[14px] font-bold transition-colors border-0 cursor-pointer flex items-center justify-between ${locationName === c.name
                                                ? 'bg-purple-50 text-[#733FE0]'
                                                : 'bg-white text-gray-800 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span>{c.name}</span>
                                        {locationName === c.name && (
                                            <span className="text-[#733FE0] font-bold">✓</span>
                                        )}
                                    </button>
                                ))
                            ) : citySearchQuery.trim() ? (
                                <div className="py-8 text-center text-gray-400 font-semibold text-[13px]">
                                    No cities found for "{citySearchQuery}"
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-400 font-medium text-[13px]">
                                    Type in search to find any city worldwide
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiscoveryFilterPopup;
