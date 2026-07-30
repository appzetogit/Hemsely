import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import tickIcon from '../assets/icons/tick.png';
import tickProfileIcon from '../assets/icons/tick-profile.png';
import settingIcon from '../assets/icons/setting.png';
import pencilIcon from '../assets/icons/pencil.png';
import textIcon from '../assets/icons/text.png';
import thumbIcon from '../assets/icons/thumb.png';
import crossIcon from '../assets/icons/cross.png';
import BottomNavigation from '../components/BottomNavigation';
import { devError } from '../../../shared/utils/logger';

/* ─── Premium Purchase Popup ─── */
const PremiumPopup = ({ type, onClose }) => {
    const isComments = type === 'comments';
    const [selectedPlan, setSelectedPlan] = useState('right');

    const plans = isComments
        ? [
            { id: 'left', count: '1', label: 'Comments', price: '199.00' },
            { id: 'right', count: '5', label: 'Comments', price: '399.00' },
        ]
        : [
            { id: 'left', count: '1', label: 'Boost', price: '199.00' },
            { id: 'right', count: '5', label: 'Boosts', price: '399.00' },
        ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[280px] bg-white rounded-[24px] p-4 shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    type="button"
                    aria-label="Close popup"
                    onClick={onClose}
                    className="absolute right-3 top-3 w-7 h-7 rounded-full bg-[#F3EAFF] hover:bg-[#EADBFF] text-[#703DE2] flex items-center justify-center transition-colors cursor-pointer border-0 z-10"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="flex flex-col items-center text-center pt-0.5">
                    {/* Header Icon Badge */}
                    <div className="w-10 h-10 rounded-xl bg-[#F3EAFF] text-[#703DE2] flex items-center justify-center mb-2">
                        {isComments ? (
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                <line x1="8" y1="9" x2="16" y2="9" />
                                <line x1="8" y1="13" x2="14" y2="13" />
                            </svg>
                        ) : (
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 10 13 2" />
                            </svg>
                        )}
                    </div>

                    <h2 className="text-[17px] font-extrabold text-black tracking-tight leading-tight">
                        {isComments ? 'Comments' : 'Profile Boost'}
                    </h2>

                    <p className="text-[11px] text-gray-500 font-normal leading-relaxed mt-1 px-1">
                        {isComments
                            ? 'Sending Comments are the best way to express yourself on Amoro'
                            : 'Boost makes your profile 20x more visible for 3 days to get 80% more matches.'}
                    </p>

                    {/* Plan Options */}
                    <div className="grid grid-cols-2 gap-2.5 my-3.5 w-full">
                        {plans.map((plan) => {
                            const isSelected = selectedPlan === plan.id;
                            return (
                                <button
                                    key={plan.id}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`relative flex flex-col items-center justify-center p-2 rounded-[16px] h-[92px] transition-all cursor-pointer border ${
                                        isSelected
                                            ? 'bg-[#FF7365] text-white border-[#FF7365] shadow-2xs scale-[1.01]'
                                            : 'bg-white text-gray-900 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <span className={`text-[16px] font-extrabold leading-tight ${isSelected ? 'text-white' : 'text-black'}`}>
                                        {plan.count}
                                    </span>
                                    <span className={`text-[11.5px] font-semibold mt-0.5 ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                        {plan.label}
                                    </span>
                                    <span className={`text-[12.5px] font-bold mt-1.5 ${isSelected ? 'text-white' : 'text-black'}`}>
                                        ₹ {plan.price}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full h-[42px] rounded-full bg-[#703DE2] hover:bg-[#602ec3] text-white font-extrabold text-[13.5px] shadow-md shadow-purple-200/80 active:scale-[0.98] transition-all cursor-pointer border-0 tracking-wide"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProfileHeaderBar = ({ onSettingsClick }) => (
    <header
        className="relative flex items-center justify-center px-4 shrink-0 shadow-xs"
        style={{
            height: '52px',
            background: '#FCFCFC',
            borderRadius: '0px 0px 14px 14px',
        }}
    >
        <h1 className="text-center font-bold text-[17px] text-black">
            Profile
        </h1>
        <button
            type="button"
            aria-label="Settings"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#733FE0] hover:opacity-80 transition-opacity cursor-pointer border-0 bg-transparent"
            onClick={onSettingsClick}
        >
            <img src={settingIcon} alt="" className="w-6 h-6 object-contain" />
        </button>
    </header>
);

const calculateAge = (dobString) => {
    if (!dobString) return null;
    const parts = String(dobString).split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    const [year, month, day] = parts;
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = (today.getMonth() + 1) - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
        age--;
    }
    return age > 0 ? age : null;
};

const ProfileAvatarSection = ({ name, age, photo, completionPercentage, isVerified, onEditClick, onPremiumClick }) => (
    <section className="flex flex-col items-center shrink-0">
        {/* Avatar Ring */}
        <div className="relative">
            <div className="w-[96px] h-[96px] rounded-full p-[3px] bg-gradient-to-tr from-[#733FE0] via-[#9B6BFF] to-[#FF4D6D] shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-purple-50 flex items-center justify-center">
                    {photo ? (
                        <img src={photo} alt={name || "User"} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-[#733FE0]">
                            <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Pencil Button */}
            <button
                type="button"
                aria-label="Edit profile"
                onClick={onEditClick}
                className="absolute top-0 -right-1 w-7.5 h-7.5 rounded-full bg-[#733FE0] text-white flex items-center justify-center shadow-md hover:bg-[#6232c7] active:scale-95 transition-all cursor-pointer border-2 border-white z-10"
            >
                <img src={pencilIcon} alt="" className="w-3.5 h-3.5 object-contain brightness-200" />
            </button>

            {/* Percentage Badge */}
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#733FE0] text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-xs tracking-tight">
                {completionPercentage}%
            </span>
        </div>

        {/* User Name & Verification */}
        <div className="mt-3 flex items-center gap-1">
            <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight leading-none">
                {name}{age ? `, ${age}` : ''}
            </h2>
            {isVerified && <img src={tickIcon} alt="" className="w-4 h-4 object-contain" />}
        </div>

        {/* Unlock Premium Banner */}
        <div className="w-full flex items-center justify-center gap-2 mt-4 px-1">
            <div className="flex-1 h-[1px] bg-gray-100/80" />
            <button
                type="button"
                onClick={onPremiumClick}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FFF6F3] border border-[#FFE8DF] hover:bg-[#FFEAE3] transition-colors cursor-pointer shrink-0 max-w-[340px] shadow-2xs"
            >
                <span className="text-[12.5px] font-semibold text-gray-900 tracking-tight whitespace-nowrap">
                    Unlock All <span className="text-[#FF6B4A] font-extrabold">Premium</span> Features
                </span>
                <img src={tickProfileIcon} alt="" className="w-4.5 h-4.5 object-contain shrink-0" />
            </button>
            <div className="flex-1 h-[1px] bg-gray-100/80" />
        </div>
    </section>
);

const QuickActionCards = ({ onOpenPopup }) => (
    <section className="mt-4 mb-4 grid grid-cols-2 gap-2.5 w-full shrink-0">
        <button
            type="button"
            onClick={() => onOpenPopup('comments')}
            className="text-left px-3 py-3 rounded-[20px] bg-[#F9F3FF] border border-[#F3E5FF] flex items-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer shadow-2xs hover:border-purple-200"
        >
            <div className="w-9 h-9 rounded-full bg-[#ECE0FF] flex items-center justify-center shrink-0">
                <img src={textIcon} alt="" className="w-4 h-4 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[13px] text-gray-900 leading-tight tracking-tight">Comments</p>
                <p className="text-[11px] text-gray-400 font-normal mt-0.5">Get now</p>
            </div>
        </button>

        <button
            type="button"
            onClick={() => onOpenPopup('boost')}
            className="text-left px-3 py-3 rounded-[20px] bg-[#FFF6F4] border border-[#FFEBE5] flex items-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer shadow-2xs hover:border-orange-200"
        >
            <div className="w-9 h-9 rounded-full bg-[#FFE5DF] flex items-center justify-center shrink-0">
                <img src={thumbIcon} alt="" className="w-4 h-4 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[13px] text-gray-900 leading-tight tracking-tight">Boost</p>
                <p className="text-[11px] text-gray-400 font-normal mt-0.5">Get now</p>
            </div>
        </button>
    </section>
);

const PremiumOfferCard = ({ onUpgradeClick }) => (
    <section className="w-full shrink-0">
        <h3 className="text-[15px] font-extrabold text-gray-900 mb-2 px-0.5">
            Our Premium offer
        </h3>

        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#733FE0] to-[#5C2DBA] p-5 text-white shadow-md">
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-extrabold text-[11px] uppercase tracking-wider mb-3">
                    PREMIUM
                </div>

                <p className="text-[13px] font-medium text-white/90 mb-4 leading-snug tracking-tight">
                    see the list of what included
                </p>

                <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="w-full h-[46px] rounded-full bg-white text-[#733FE0] font-extrabold text-[14.5px] shadow-xs hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer border-0"
                >
                    Upgrade
                </button>
            </div>
        </div>
    </section>
);

const ProfilePreviewPage = () => {
    const [popup, setPopup] = useState(null);
    const [userProfile, setUserProfile] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await apiClient.get('/auth/me');
                if (res.ok && res.data?.user) {
                    setUserProfile(res.data.user);
                    sessionStorage.setItem('user', JSON.stringify(res.data.user));
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                }
            } catch {
                // Silent catch for profile fetch
            }
        };

        fetchUserProfile();
    }, []);

    // Compute real user profile details dynamically
    const profileState = React.useMemo(() => {
        const storedOnboardingProfile = (() => {
            try {
                return JSON.parse(localStorage.getItem('onboarding_profile:v1') || '{}');
            } catch {
                return {};
            }
        })();

        // Real Name
        const name = userProfile.firstName || userProfile.name || storedOnboardingProfile.name || 'User';

        // Real Age
        let age = '';
        if (userProfile.dob) {
            age = calculateAge(userProfile.dob);
        } else if (storedOnboardingProfile.dob) {
            age = calculateAge(storedOnboardingProfile.dob);
        } else if (userProfile.age) {
            age = userProfile.age;
        }

        // Real Photo
        let photo = userProfile.profilePicture || null;
        if (!photo && userProfile.galleryImages?.length > 0) {
            const firstImg = userProfile.galleryImages[0];
            photo = typeof firstImg === 'string' ? firstImg : firstImg?.url;
        }
        if (!photo) {
            const coverPhoto = localStorage.getItem('onboarding_cover_photo:v1');
            if (coverPhoto && !coverPhoto.includes('wallet') && !coverPhoto.includes('svg')) {
                photo = coverPhoto;
            } else {
                try {
                    const photoData = JSON.parse(localStorage.getItem('onboarding_photos:v1') || '{}');
                    if (photoData.photos && photoData.photos.length > 0) {
                        const found = photoData.photos.find(p => p !== null && typeof p === 'string' && !p.includes('wallet') && !p.includes('svg'));
                        if (found) photo = found;
                    }
                } catch {}
            }
        }

        // Dynamic Completion Percentage based on completed profile fields
        let completedScore = 0;
        if (name && name !== 'User') completedScore += 20;
        if (age) completedScore += 20;
        if (userProfile.gender || localStorage.getItem('onboarding_gender:v1')) completedScore += 15;
        if (photo) completedScore += 25;
        if (userProfile.interests?.length > 0 || localStorage.getItem('onboarding_interests:v1')) completedScore += 10;
        if (userProfile.relationshipGoal || localStorage.getItem('onboarding_goals:v1')) completedScore += 10;

        const completionPercentage = Math.min(100, Math.max(10, completedScore));

        return {
            name,
            age,
            photo,
            completionPercentage,
            isVerified: !!userProfile.isVerified,
        };
    }, [userProfile]);

    return (
        <div
            className="h-[100dvh] flex flex-col max-w-[414px] mx-auto overflow-hidden"
            style={{ background: '#FCFCFC' }}
        >
            <ProfileHeaderBar onSettingsClick={() => navigate('/settings')} />

            <main className="flex-1 flex flex-col justify-start overflow-y-auto px-4 pt-6 pb-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ProfileAvatarSection
                    name={profileState.name}
                    age={profileState.age}
                    photo={profileState.photo}
                    completionPercentage={profileState.completionPercentage}
                    isVerified={profileState.isVerified}
                    onEditClick={() => navigate('/edit-profile')}
                    onPremiumClick={() => navigate('/premium')}
                />
                <QuickActionCards onOpenPopup={setPopup} />
                <PremiumOfferCard onUpgradeClick={() => navigate('/premium')} />
            </main>

            <BottomNavigation activeTab="profile" />

            {popup && <PremiumPopup type={popup} onClose={() => setPopup(null)} />}
        </div>
    );
};

export default ProfilePreviewPage;
