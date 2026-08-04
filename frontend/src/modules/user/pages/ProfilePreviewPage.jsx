import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import tickIcon from '../assets/icons/tick.png';
import tickProfileIcon from '../assets/icons/tick-profile.png';
import settingIcon from '../assets/icons/setting.png';
import pencilIcon from '../assets/icons/pencil.png';
import thumbIcon from '../assets/icons/thumb.png';
import crossIcon from '../assets/icons/cross.png';
import premiumBg from '../../../assets/premiumbackground.png';
import BottomNavigation from '../components/BottomNavigation';
import VerifiedBadge from '../components/VerifiedBadge';
import BoostAnimationOverlay from '../components/BoostAnimationOverlay';
import { loadRazorpayScript } from '../../../shared/utils/razorpayLoader';
import { devError } from '../../../shared/utils/logger';

/* ─── Premium Purchase Popup ─── */
const PremiumPopup = ({ type, onClose, onSuccess }) => {
    const isComments = type === 'comments';
    const [selectedPlan, setSelectedPlan] = useState('right');
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState(() => (
        isComments
            ? [
                { id: 'left', count: 1, label: 'Comment', price: 199 },
                { id: 'right', count: 5, label: 'Comments', price: 399 },
            ]
            : [
                { id: 'left', count: 1, label: 'Boost', price: 199 },
                { id: 'right', count: 5, label: 'Boosts', price: 399 },
            ]
    ));

    useEffect(() => {
        if (!isComments) {
            apiClient.get('/subscriptions/boost-plans')
                .then(({ data, ok }) => {
                    if (ok && data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
                        setPlans(data.plans);
                    }
                })
                .catch(() => {});
        }
    }, [isComments]);

    const selectedPlanObj = plans.find(p => p.id === selectedPlan) || plans[1] || plans[0];

    const handleBuyNow = async () => {
        setLoading(true);
        try {
            const { data, ok } = await apiClient.post('/subscriptions/boost/create-order', {
                optionId: selectedPlan,
                count: selectedPlanObj.count,
                price: selectedPlanObj.price,
            });

            if (!ok || !data || !data.success) {
                alert(data?.message || 'Could not initiate Razorpay payment');
                setLoading(false);
                return;
            }

            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                alert('Razorpay SDK failed to load. Please check your internet connection.');
                setLoading(false);
                return;
            }

            const options = {
                key: data.key,
                amount: data.amount,
                currency: data.currency || 'INR',
                name: 'Hemsely',
                description: `${selectedPlanObj.count} Profile ${selectedPlanObj.count === 1 ? 'Boost' : 'Boosts'}`,
                order_id: data.orderId,
                prefill: {
                    name: data.userDetails?.name || '',
                    email: data.userDetails?.email || '',
                    contact: data.userDetails?.phone || '',
                },
                handler: async function (response) {
                    try {
                        const verifyRes = await apiClient.post('/subscriptions/boost/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            transactionId: data.transactionId,
                            count: selectedPlanObj.count,
                        });

                        if (verifyRes.ok && verifyRes.data?.success) {
                            const updatedUser = verifyRes.data.user;
                            if (updatedUser) {
                                localStorage.setItem('user', JSON.stringify(updatedUser));
                                sessionStorage.setItem('user', JSON.stringify(updatedUser));
                                if (onSuccess) onSuccess(updatedUser);
                            }
                            alert(`🎉 ${selectedPlanObj.count} Boost(s) added successfully!`);
                            onClose();
                        } else {
                            alert(verifyRes.data?.message || 'Payment verification failed');
                        }
                    } catch (err) {
                        alert('Error verifying payment with server');
                    } finally {
                        setLoading(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    },
                },
                theme: {
                    color: '#703DE2',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
                setLoading(false);
            });
            rzp.open();
        } catch (err) {
            alert('Payment failed to initiate');
            setLoading(false);
        }
    };

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
                                    className={`relative flex flex-col items-center justify-center p-2 rounded-[16px] h-[92px] transition-all cursor-pointer border ${isSelected
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
                                        ₹ {plan.price}.00
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Buy Now Button */}
                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleBuyNow}
                        className="w-full h-[42px] rounded-full bg-[#703DE2] hover:bg-[#602ec3] disabled:opacity-50 text-white font-extrabold text-[13.5px] shadow-md shadow-purple-200/80 active:scale-[0.98] transition-all cursor-pointer border-0 tracking-wide flex items-center justify-center"
                    >
                        {loading ? 'Processing...' : 'Buy Now'}
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

const ProfileAvatarSection = ({ name, age, photo, completionPercentage, isVerified, isPremium, onEditClick, onPremiumClick }) => (
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

        {/* User Name & Blue Verified Badge (Exclusive for Premium users) */}
        <div className="mt-3 flex items-center gap-1.5 justify-center">
            <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight leading-none">
                {name}
            </h2>
            {isPremium && <VerifiedBadge size={20} />}
        </div>

        {/* Premium Banner */}
        <div className="w-full flex items-center justify-center gap-2 mt-4 px-1">
            <div className="flex-1 h-[1px] bg-gray-100/80" />
            <button
                type="button"
                onClick={onPremiumClick}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FFF6F3] border border-[#FFE8DF] hover:bg-[#FFEAE3] transition-colors cursor-pointer shrink-0 max-w-[340px] shadow-2xs"
            >
                <span className="text-[12.5px] font-semibold text-gray-900 tracking-tight whitespace-nowrap">
                    {isPremium ? (
                        <>You have <span className="text-[#FF6B4A] font-extrabold">Premium Access</span></>
                    ) : (
                        <>Unlock All <span className="text-[#FF6B4A] font-extrabold">Premium</span> Features</>
                    )}
                </span>
                <img src={tickProfileIcon} alt="" className="w-4.5 h-4.5 object-contain shrink-0" />
            </button>
            <div className="flex-1 h-[1px] bg-gray-100/80" />
        </div>
    </section>
);

const QuickActionCards = ({ isPremium, boostCount, onOpenPopup, onUseBoost, boosting }) => {
    const totalBoosts = isPremium ? (boostCount !== undefined && boostCount !== null ? boostCount : 1) : (boostCount || 0);
    const hasBoosts = totalBoosts > 0;

    return (
        <section className="mt-4 mb-4 w-full shrink-0">
            <button
                type="button"
                disabled={boosting}
                onClick={() => (hasBoosts ? onUseBoost() : onOpenPopup('boost'))}
                className="w-full text-left px-3.5 py-3 rounded-[20px] bg-[#FFEBE4] border border-[#FFD2C6] flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer shadow-2xs hover:border-orange-300 disabled:opacity-60"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-9.5 h-9.5 rounded-full bg-[#FFD4CA] flex items-center justify-center shrink-0">
                        <img src={thumbIcon} alt="" className="w-4 h-4 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-[13px] text-gray-900 leading-tight tracking-tight">Boost</p>
                        <p className="text-[11px] text-[#FF6B4A] font-semibold mt-0.5">
                            {isPremium
                                ? `${totalBoosts} ${totalBoosts === 1 ? 'Boost you have' : 'Boosts you have'}`
                                : hasBoosts
                                    ? `${totalBoosts} ${totalBoosts === 1 ? 'Boost' : 'Boosts'} available`
                                    : 'Get now'}
                        </p>
                    </div>
                </div>

                <div className="shrink-0">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#703DE2] text-white text-[11px] font-extrabold shadow-2xs active:scale-95 transition-all">
                        {boosting ? 'Boosting...' : hasBoosts ? 'Use Boost' : 'Get Now'}
                    </span>
                </div>
            </button>
        </section>
    );
};

const PremiumOfferCard = ({ onUpgradeClick }) => (
    <section className="w-full shrink-0">
        <h3 className="text-[15px] font-extrabold text-gray-900 mb-2 px-0.5">
            Our Premium offer
        </h3>

        <div
            className="relative overflow-hidden rounded-[24px] bg-cover bg-center p-5 text-white shadow-md"
            style={{ backgroundImage: `url(${premiumBg})` }}
        >
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
    const navigate = useNavigate();
    const [popup, setPopup] = useState(null);
    const [boosting, setBoosting] = useState(false);
    const [showBoostAnim, setShowBoostAnim] = useState(false);
    const [userProfile, setUserProfile] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    });

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

    const handleUseBoost = async () => {
        if (boosting) return;
        setBoosting(true);
        try {
            const { data, ok } = await apiClient.post('/users/boost/activate');
            if (ok && data?.success) {
                setUserProfile(data.user);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('user', JSON.stringify(data.user));
                setShowBoostAnim(true);
            } else {
                alert(data?.message || 'Could not activate boost');
            }
        } catch {
            alert('Error activating boost');
        } finally {
            setBoosting(false);
        }
    };

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
        const fullName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ');
        const name = fullName || userProfile.name || storedOnboardingProfile.name || 'User';

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
                } catch { }
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
            isPremium: !!userProfile.isPremium || userProfile.subscriptionName === 'Premium',
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
                    isPremium={profileState.isPremium}
                    onEditClick={() => navigate('/edit-profile')}
                    onPremiumClick={() => navigate('/premium')}
                />
                <QuickActionCards
                    isPremium={profileState.isPremium}
                    boostCount={userProfile.boostCount}
                    onOpenPopup={setPopup}
                    onUseBoost={handleUseBoost}
                    boosting={boosting}
                />
                <PremiumOfferCard onUpgradeClick={() => navigate('/premium')} />
            </main>

            <BottomNavigation activeTab="profile" />

            {popup && (
                <PremiumPopup
                    type={popup}
                    onClose={() => setPopup(null)}
                    onSuccess={(updatedUser) => setUserProfile(updatedUser)}
                />
            )}

            {showBoostAnim && (
                <BoostAnimationOverlay onClose={() => setShowBoostAnim(false)} />
            )}
        </div>
    );
};

export default ProfilePreviewPage;
