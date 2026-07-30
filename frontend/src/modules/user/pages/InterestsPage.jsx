import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { syncFullOnboardingData, updateUserProfile } from '../services/userApi';

const INTERESTS_STORAGE_KEY = 'onboarding_interests:v1';

// SVG Icons matching design icons
const icons = {
    camera: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
    cooking: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13h18c0 4-4 8-9 8s-9-4-9-8z" /><path d="M6 10V6" /><path d="M11 10V4" /><path d="M18 10V6" /></svg>,
    games: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" /><rect x="2" y="6" width="20" height="12" rx="2" /></svg>,
    music: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
    travel: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 8l5-5l5 15H2z" /></svg>,
    shopping: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>,
    mic: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
    art: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>,
    swim: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22c3-4 7-4 10 0" /><path d="M12 22c3-4 7-4 10 0" /><path d="M2 17c3-4 7-4 10 0" /><path d="M12 17c3-4 7-4 10 0" /><path d="M2 12c3-4 7-4 10 0" /><path d="M12 12c3-4 7-4 10 0" /></svg>,
    drink: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8" /><path d="M7 10h10" /><path d="M12 15v7" /><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" /></svg>,
    extreme: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12v6" /><path d="m20.2 6.8-5.3 4.2" /><path d="m3.8 6.8 5.3 4.2" /><path d="M2 12h20" /><path d="M12 2a10 10 0 0 1 10 10" /><path d="M12 2A10 10 0 0 0 2 12" /></svg>,
    fitness: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6" /><path d="M18.65 10.15c.85-.85.85-2.22 0-3.07l-1.06-1.06c-.85-.85-2.22-.85-3.07 0L12 8.52" /><path d="M10.8 5.4 12 6.6" /><path d="M10.8 5.4 6 10.2" /><path d="M12 6.6l4.2 4.2" /><path d="M8.52 12l2.48-2.48" /><path d="M5.35 13.85c-.85.85-.85 2.22 0 3.07l1.06 1.06c.85.85 2.22.85 3.07 0L12 15.48" /></svg>,
};

const ALL_INTERESTS = [
    { name: 'Photography', icon: icons.camera },
    { name: 'Cooking', icon: icons.cooking },
    { name: 'Video Games', icon: icons.games },
    { name: 'Music', icon: icons.music },
    { name: 'Travelling', icon: icons.travel },
    { name: 'Shopping', icon: icons.shopping },
    { name: 'Speeches', icon: icons.mic },
    { name: 'Art & Crafts', icon: icons.art },
    { name: 'Swimming', icon: icons.swim },
    { name: 'Drinking', icon: icons.drink },
    { name: 'Extreme Sports', icon: icons.extreme },
    { name: 'Fitness', icon: icons.fitness },
    { name: 'Dancing', icon: icons.music },
    { name: 'Movies', icon: icons.camera },
    { name: 'Reading', icon: icons.mic },
    { name: 'Anime', icon: icons.games },
    { name: 'Fashion', icon: icons.shopping },
    { name: 'Foodie', icon: icons.cooking },
    { name: 'Pets', icon: icons.travel },
    { name: 'Cycling', icon: icons.fitness },
    { name: 'Coffee', icon: icons.drink },
    { name: 'Podcasts', icon: icons.mic },
    { name: 'Board Games', icon: icons.games },
    { name: 'Yoga', icon: icons.swim },
];

const InterestsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const returnPath = location.state?.from;

    const savedInterests = React.useMemo(() => {
        try {
            const data = JSON.parse(localStorage.getItem(INTERESTS_STORAGE_KEY) || '[]');
            return Array.isArray(data) ? data : ['Photography', 'Travelling', 'Art & Crafts'];
        } catch {
            return ['Photography', 'Travelling', 'Art & Crafts'];
        }
    }, []);

    const [selected, setSelected] = useState(savedInterests);
    const [visibleCount, setVisibleCount] = useState(12);

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const toggleInterest = (name) => {
        if (selectedSet.has(name)) {
            setSelected(selected.filter(i => i !== name));
        } else {
            setSelected([...selected, name]);
        }
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => Math.min(prev + 6, ALL_INTERESTS.length));
    };

    const handleSkip = () => {
        if (returnPath) {
            navigate(returnPath, { replace: true });
        } else {
            navigate('/relationship-goals');
        }
    };

    const handleContinue = async () => {
        localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(selected));
        const storedUserId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
        if (storedUserId) {
            try {
                await updateUserProfile(storedUserId, { interests: selected });
            } catch {}
        } else {
            try {
                await syncFullOnboardingData();
            } catch {}
        }

        if (returnPath) {
            navigate(returnPath, { replace: true });
        } else {
            navigate('/relationship-goals');
        }
    };

    const visibleInterests = ALL_INTERESTS.slice(0, visibleCount);
    const hasMore = visibleCount < ALL_INTERESTS.length;

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between pt-3 pb-4 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar with Back Button and Skip Link */}
            <div className="flex items-center justify-between w-full pt-1 mb-2">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => {
                        if (returnPath) {
                            navigate(returnPath, { replace: true });
                        } else {
                            navigate('/enable-location');
                        }
                    }}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>

                <button
                    type="button"
                    onClick={handleSkip}
                    className="text-[15px] font-bold text-gray-900 hover:text-[#6E36E4] transition-colors cursor-pointer bg-transparent border-0"
                >
                    Skip
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-start w-full overflow-hidden">
                {/* Titles */}
                <div className="text-center mb-4 shrink-0">
                    <h2 className="text-[28px] leading-tight font-extrabold text-black mb-1 tracking-tight">
                        Likes, Interests
                    </h2>
                    <p className="text-[13px] text-gray-400 font-normal">
                        Share your likes & passion with others
                    </p>
                </div>

                {/* Grid - Pill Capsule layout (rounded-full) */}
                <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-none">
                    <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
                        {visibleInterests.map((interest) => {
                            const isSelected = selectedSet.has(interest.name);
                            return (
                                <button
                                    key={interest.name}
                                    type="button"
                                    onClick={() => toggleInterest(interest.name)}
                                    aria-pressed={isSelected}
                                    className={`flex items-center space-x-1.5 h-[46px] px-2.5 rounded-full transition-all cursor-pointer border-[1.5px] ${isSelected
                                            ? 'border-[#6E36E4] bg-[#F9F5FF] text-gray-900 shadow-2xs'
                                            : 'border-[#F0EAFF] bg-white text-gray-800 hover:border-[#6E36E4]'
                                        }`}
                                >
                                    <div className={`shrink-0 flex items-center justify-center ${isSelected ? 'text-[#6E36E4]' : 'text-gray-700'}`}>
                                        {interest.icon}
                                    </div>
                                    <span className="text-[12px] font-semibold text-left leading-tight whitespace-nowrap">
                                        {interest.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                        <div className="w-full text-center py-2">
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                className="text-[#6E36E4] font-bold text-[15px] hover:underline cursor-pointer transition-colors bg-transparent border-0"
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="w-full shrink-0 pt-2">
                <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all cursor-pointer"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default InterestsPage;
