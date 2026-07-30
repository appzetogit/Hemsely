import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncFullOnboardingData } from '../services/userApi';
import { devError } from '../../../shared/utils/logger';

const GOALS_STORAGE_KEY = 'onboarding_goals:v1';

const GOAL_OPTIONS = [
    {
        id: 'Long-term Partner',
        label: 'Long-term Partner',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF3B5C" stroke="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        )
    },
    {
        id: 'Just casual',
        label: 'Just casual',
        icon: <span className="text-[20px] leading-none">🎉</span>
    }
];

const RelationshipGoalsPage = () => {
    const navigate = useNavigate();
    const savedGoal = React.useMemo(() => localStorage.getItem(GOALS_STORAGE_KEY) || 'Long-term Partner', []);
    const [selected, setSelected] = useState(savedGoal);
    const [loading, setLoading] = useState(false);
    const canContinue = Boolean(selected);

    const handleSkip = () => {
        navigate('/review-profile');
    };

    const handleNext = async () => {
        if (!canContinue || loading) return;
        setLoading(true);
        try {
            localStorage.setItem(GOALS_STORAGE_KEY, selected);
            // Sync all onboarding signup data to MongoDB
            await syncFullOnboardingData();
        } catch (e) {
            devError('Error syncing onboarding data:', e);
        } finally {
            setLoading(false);
            navigate('/review-profile');
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-6 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar with Back Button and Skip Link */}
            <div className="flex items-center justify-between w-full pt-2">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate('/interests')}
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

            {/* Main Content Area - Aligned to top */}
            <div className="flex-1 flex flex-col justify-start w-full pt-6 px-2">
                {/* Title */}
                <div className="text-center mb-8 shrink-0">
                    <h2 className="text-[26px] leading-tight font-extrabold text-black mb-2 tracking-tight">
                        What are you Looking for?
                    </h2>
                    <p className="text-[13px] text-gray-400 font-normal max-w-[280px] mx-auto leading-relaxed">
                        All good if it changes. There’s something for everyone.
                    </p>
                </div>

                {/* Options List - Capsule Pills (rounded-full) */}
                <div className="w-full space-y-3.5">
                    {GOAL_OPTIONS.map((option) => {
                        const isSelected = selected === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelected(option.id)}
                                aria-pressed={isSelected}
                                className={`w-full flex items-center px-6 h-[54px] rounded-full transition-all cursor-pointer border-[1.5px] ${
                                    isSelected
                                        ? 'bg-[#F9F5FF] border-[#6E36E4] shadow-xs'
                                        : 'bg-white border-[#F0EAFF] hover:border-[#6E36E4]'
                                }`}
                            >
                                <div className="shrink-0 flex items-center justify-center mr-4">
                                    {option.icon}
                                </div>
                                <span className="text-[15px] font-semibold text-gray-900 text-left">
                                    {option.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Next Button */}
            <div className="w-full shrink-0 mb-4">
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canContinue || loading}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[52px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    {loading ? 'Saving...' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default RelationshipGoalsPage;
