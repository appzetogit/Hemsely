import React, { useState } from 'react';

const POPULAR_CITIES = [
    { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi, India', lat: 28.6139, lng: 77.2090 },
    { name: 'Bengaluru, India', lat: 12.9716, lng: 77.5946 },
    { name: 'Pune, India', lat: 18.5204, lng: 73.8567 },
    { name: 'Hyderabad, India', lat: 17.3850, lng: 78.4867 },
    { name: 'Jaipur, India', lat: 26.9124, lng: 75.7873 },
    { name: 'Kolkata, India', lat: 22.5726, lng: 88.3639 },
    { name: 'Chennai, India', lat: 13.0827, lng: 80.2707 },
    { name: 'Ahmedabad, India', lat: 23.0225, lng: 72.5714 },
    { name: 'Goa, India', lat: 15.2993, lng: 74.1240 },
];

const RELATIONSHIP_GOALS = [
    { label: 'Any Goal', value: 'any' },
    { label: 'Long-term', value: 'Long-term' },
    { label: 'Casual', value: 'Casual' },
    { label: 'Marriage', value: 'Marriage' },
    { label: 'Dating', value: 'Dating' },
    { label: 'Friendship', value: 'Friendship' }
];

const RELIGION_OPTIONS = [
    { label: 'Any Religion', value: 'any' },
    { label: 'Hindu', value: 'Hindu' },
    { label: 'Muslim', value: 'Muslim' },
    { label: 'Christian', value: 'Christian' },
    { label: 'Sikh', value: 'Sikh' },
    { label: 'Buddhist', value: 'Buddhist' },
    { label: 'Jain', value: 'Jain' },
    { label: 'Spiritual', value: 'Spiritual' },
    { label: 'Agnostic/Other', value: 'Agnostic' }
];

const EDUCATION_OPTIONS = [
    { label: 'Any Level', value: 'any' },
    { label: 'High School', value: 'High School' },
    { label: 'Bachelor\'s', value: 'Bachelor' },
    { label: 'Master\'s', value: 'Master' },
    { label: 'Doctorate', value: 'Doctorate' }
];

const HABIT_OPTIONS = [
    { label: 'Any', value: 'any' },
    { label: 'Socially', value: 'Socially' },
    { label: 'Never', value: 'Never' },
    { label: 'Frequently', value: 'Frequently' }
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

    // Location State
    const defaultUserCity = (() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            return u?.location?.city || u?.location?.address || 'Mumbai, India';
        } catch {
            return 'Mumbai, India';
        }
    })();

    const [locationName, setLocationName] = useState(() => appliedFilters?.locationName || defaultUserCity);
    const [selectedCoords, setSelectedCoords] = useState(() => ({
        lat: appliedFilters?.lat || null,
        lng: appliedFilters?.lng || null,
    }));
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');

    // Advanced Filter State
    const [relationshipGoal, setRelationshipGoal] = useState(() => appliedFilters?.relationshipGoal || 'any');
    const [religion, setReligion] = useState(() => appliedFilters?.religion || 'any');
    const [education, setEducation] = useState(() => appliedFilters?.education || 'any');
    const [drinkingStatus, setDrinkingStatus] = useState(() => appliedFilters?.drinkingStatus || 'any');
    const [smokingStatus, setSmokingStatus] = useState(() => appliedFilters?.smokingStatus || 'any');

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
            navigator.geolocation.getCurrentPosition((pos) => {
                setSelectedCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationName('Current Location');
                setShowLocationPicker(false);
            }, () => {
                setLocationName(defaultUserCity);
                setShowLocationPicker(false);
            });
        } else {
            setShowLocationPicker(false);
        }
    };

    const filteredCities = POPULAR_CITIES.filter(c => 
        c.name.toLowerCase().includes(citySearchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end pointer-events-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Backdrop Button */}
            <button
                type="button"
                aria-label="Close filter modal backdrop"
                className="fixed inset-0 border-0 cursor-default"
                onClick={onClose}
            />

            {/* Modal Sheet */}
            <div className="w-full max-w-[414px] mx-auto bg-white rounded-t-[32px] shadow-2xl p-5 overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[88vh]">
                
                {/* Top Drag Handle */}
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />

                {/* Header Tabs matching exact design */}
                <div className="w-full h-11 bg-gray-100 p-1 rounded-full flex items-center mb-5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-1.5 rounded-full text-[14px] font-extrabold transition-all cursor-pointer border-0 ${
                            activeTab === 'basic'
                                ? 'bg-[#733FE0] text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Basic Filter
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('advance')}
                        className={`flex-1 py-1.5 rounded-full text-[14px] font-extrabold transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                            activeTab === 'advance'
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
                                                className={`h-[42px] rounded-full text-[14px] font-bold transition-all cursor-pointer border ${
                                                    isSelected
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

                            {/* Location Picker Row */}
                            <div>
                                <h3 className="text-[15px] font-bold text-gray-900 mb-3">
                                    Location
                                </h3>
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
                                <div className="flex items-center gap-3">
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
                        </>
                    ) : (
                        /* Advance Filter Tab */
                        <div className="space-y-5">
                            {/* Status Banner */}
                            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
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
                                        { text: 'Long-term relationship goals', check: true },
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
                                    {/* 1. Relationship Goals */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Relationship Goals
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {RELATIONSHIP_GOALS.map((opt) => {
                                                const isSel = relationshipGoal.toLowerCase() === opt.value.toLowerCase();
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setRelationshipGoal(opt.value)}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${
                                                            isSel
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

                                    {/* 2. Religious & Cultural Beliefs */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Religious & Cultural Beliefs
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {RELIGION_OPTIONS.map((opt) => {
                                                const isSel = religion.toLowerCase() === opt.value.toLowerCase();
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setReligion(opt.value)}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${
                                                            isSel
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

                                    {/* 3. Education Level */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Education Level
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {EDUCATION_OPTIONS.map((opt) => {
                                                const isSel = education.toLowerCase() === opt.value.toLowerCase();
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setEducation(opt.value)}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${
                                                            isSel
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

                                    {/* 4. Drinking Habits */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Drinking Habits
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {HABIT_OPTIONS.map((opt) => {
                                                const isSel = drinkingStatus.toLowerCase() === opt.value.toLowerCase();
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setDrinkingStatus(opt.value)}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${
                                                            isSel
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

                                    {/* 5. Smoking Habits */}
                                    <div>
                                        <label className="block text-[13.5px] font-bold text-gray-800 mb-2">
                                            Smoking Habits
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {HABIT_OPTIONS.map((opt) => {
                                                const isSel = smokingStatus.toLowerCase() === opt.value.toLowerCase();
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setSmokingStatus(opt.value)}
                                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all border cursor-pointer ${
                                                            isSel
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
                    <div className="w-full max-w-[414px] mx-auto bg-white rounded-t-[32px] shadow-2xl p-5 overflow-hidden flex flex-col relative max-h-[80vh]">
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

                        {/* City List */}
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {filteredCities.map((c) => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => handleSelectCity(c)}
                                    className={`w-full py-3 px-4 rounded-xl text-left text-[14px] font-bold transition-colors border-0 cursor-pointer flex items-center justify-between ${
                                        locationName === c.name 
                                            ? 'bg-purple-50 text-[#733FE0]' 
                                            : 'bg-white text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{c.name}</span>
                                    {locationName === c.name && (
                                        <span className="text-[#733FE0] font-bold">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiscoveryFilterPopup;
