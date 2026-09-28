import React, { useState, useEffect, useCallback } from 'react';
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
import { launchGooglePlayPurchase, queryGooglePlayProductDetails, isGooglePlayBridgeAvailable } from '../../../shared/utils/googlePlayBillingBridge';
import GooglePlayBillingModal from '../components/GooglePlayBillingModal';
import { devError } from '../../../shared/utils/logger';
import { calculateProfileStrength } from '../../../shared/utils/profileStrength';
import { useProfileBoost } from '../../../shared/hooks/useProfileBoost';

/* ─── Premium Purchase Popup (Google Play Billing for In-App Boosts) ─── */
const PremiumPopup = ({ type, onClose, onSuccess }) => {
    const isComments = type === 'comments';
    const [selectedPlan, setSelectedPlan] = useState('right');
    const [loading, setLoading] = useState(false);
    const [showPlayModal, setShowPlayModal] = useState(false);
    const [plans, setPlans] = useState(() => (
        isComments
            ? [
                { id: 'left', count: 1, label: 'Comment', price: 199, priceDisplay: '₹199', productId: 'hemsely_boost_1' },
                { id: 'right', count: 5, label: 'Comments', price: 399, priceDisplay: '₹399', productId: 'hemsely_boost_5' },
            ]
            : [
                { id: 'left', count: 1, label: 'Boost', price: 199, priceDisplay: '₹199', productId: 'hemsely_boost_1' },
                { id: 'right', count: 5, label: 'Boosts', price: 399, priceDisplay: '₹399', productId: 'hemsely_boost_5' },
            ]
    ));

    useEffect(() => {
        if (!isComments) {
            // Fetch backend plan config
            apiClient.get('/subscriptions/boost-plans')
                .then(({ data, ok }) => {
                    if (ok && data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
                        setPlans(data.plans.map(p => ({
                            ...p,
                            priceDisplay: `₹${p.price}`,
                            productId: p.productId || (p.count === 5 ? 'hemsely_boost_5' : 'hemsely_boost_1'),
                        })));
                    }
                })
                .catch(() => { });

            // Query dynamic Google Play Store localized prices
            queryGooglePlayProductDetails(['hemsely_boost_1', 'hemsely_boost_5']).then((details) => {
                if (Array.isArray(details) && details.length > 0) {
                    setPlans(prev => prev.map(p => {
                        const playItem = details.find(d => d.productId === p.productId || (p.count === 5 && d.productId.includes('5')) || (p.count === 1 && d.productId.includes('1')));
                        if (playItem) {
                            return { ...p, priceDisplay: playItem.formattedPrice || playItem.price || p.priceDisplay };
                        }
                        return p;
                    }));
                }
            }).catch(() => { });
        }
    }, [isComments]);

    const selectedPlanObj = plans.find(p => p.id === selectedPlan) || plans[1] || plans[0];

    const handleBuyNow = () => {
        if (isGooglePlayBridgeAvailable()) {
            executeNativeBoostPurchase();
        } else {
            setShowPlayModal(true);
        }
    };

    const executeNativeBoostPurchase = async () => {
        setLoading(true);
        const targetProductId = selectedPlanObj.productId || (selectedPlanObj.count === 5 ? 'hemsely_boost_5' : 'hemsely_boost_1');

        try {
            const purchaseResult = await launchGooglePlayPurchase({
                productId: targetProductId,
                isSubscription: false,
            });

            await verifyBoostPurchase(purchaseResult);
        } catch (err) {
            console.warn('⚠️ Google Play Boost purchase error:', err.message);
            if (!err.message?.toLowerCase().includes('cancel')) {
                alert(err.message || 'Payment failed to initiate');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleModalConfirmPurchase = async () => {
        const targetProductId = selectedPlanObj.productId || (selectedPlanObj.count === 5 ? 'hemsely_boost_5' : 'hemsely_boost_1');
        const mockToken = `gp_token_inapp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const orderId = `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10000 + Math.random() * 90000)}`;

        await verifyBoostPurchase({
            purchaseToken: mockToken,
            productId: targetProductId,
            orderId,
            packageName: 'com.hemsely.app',
        });
        setShowPlayModal(false);
    };

    const verifyBoostPurchase = async ({ purchaseToken, productId, orderId, packageName }) => {
        const verifyRes = await apiClient.post('/google-play/verify-purchase', {
            purchaseToken,
            productId,
            orderId,
            packageName: packageName || 'com.hemsely.app',
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
            throw new Error(verifyRes.data?.message || 'Google Play purchase verification failed');
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
                                        {plan.priceDisplay || `₹${plan.price}`}
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

            {/* Google Play In-App Purchase Modal */}
            <GooglePlayBillingModal
                isOpen={showPlayModal}
                product={{
                    name: `${selectedPlanObj.count} Profile Boost${selectedPlanObj.count > 1 ? 's' : ''}`,
                    priceDisplay: selectedPlanObj.priceDisplay || `₹${selectedPlanObj.price}.00`,
                    durationText: 'Consumable In-App Product',
                    productId: selectedPlanObj.productId || (selectedPlanObj.count === 5 ? 'hemsely_boost_5' : 'hemsely_boost_1'),
                    isSubscription: false,
                }}
                onClose={() => setShowPlayModal(false)}
                onConfirmPurchase={handleModalConfirmPurchase}
            />
        </div>
    );
};

const ProfileHeaderBar = () => (
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

        {/* User Name & Blue Verified Badge (Exclusive for users with BOTH Premium access AND Selfie Verification) */}
        <div className="mt-3 flex items-center gap-1.5 justify-center">
            <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight leading-none">
                {name}
            </h2>
            {isPremium && isVerified && <VerifiedBadge size={20} />}
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

const QuickActionCards = ({ isPremium, boostCount, onOpenPopup, onUseBoost, boosting, isBoostActive, formattedRemaining }) => {
    const totalBoosts = isPremium
        ? (typeof boostCount === 'number' && boostCount > 0 ? boostCount : 1)
        : (typeof boostCount === 'number' ? boostCount : 0);
    const hasBoosts = totalBoosts > 0;

    if (isBoostActive) {
        return (
            <section className="mt-4 mb-4 w-full shrink-0">
                <div
                    className="w-full text-left px-3.5 py-3 rounded-[20px] bg-gradient-to-r from-[#FFF5F1] via-[#FFEBE4] to-[#FFF0EA] border-2 border-[#FF6B4A] flex items-center justify-between shadow-sm relative overflow-hidden transition-all"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-9.5 h-9.5 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA733] flex items-center justify-center shrink-0 shadow-xs text-white">
                            <span className="text-[17px] leading-none animate-pulse">🚀</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-[13.5px] text-gray-900 leading-tight tracking-tight">Boost</p>
                            <p className="text-[11px] text-[#E04F2E] font-semibold mt-0.5 tracking-tight tabular-nums">
                                Boost active · <span className="font-black text-gray-900">{formattedRemaining}</span> remaining
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF6B4A] to-[#FFA733] text-white text-[11px] font-extrabold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Active
                        </span>
                    </div>
                </div>
            </section>
        );
    }

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
                                    : '0 Boosts available • Tap to Get'}
                        </p>
                    </div>
                </div>

                <div className="shrink-0">
                    <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#703DE2] hover:bg-[#5f2ed3] text-white text-[11.5px] font-extrabold shadow-2xs active:scale-95 transition-all">
                        {boosting ? 'Boosting...' : hasBoosts ? 'Use Boost' : 'Get Now'}
                    </span>
                </div>
            </button>
        </section>
    );
};

const PremiumOfferCard = ({ isPremium, onUpgradeClick }) => (
    <section className="w-full shrink-0">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h3 className="text-[15px] font-extrabold text-gray-900 tracking-tight">
                Our Premium offer
            </h3>
            <button
                type="button"
                onClick={onUpgradeClick}
                className="text-[12px] font-bold text-[#733FE0] hover:text-[#5e2cd6] transition-colors cursor-pointer bg-transparent border-0"
            >
                {isPremium ? 'View Perks' : 'View all plans →'}
            </button>
        </div>

        <div
            className="relative overflow-hidden rounded-[24px] p-4.5 text-white shadow-xl shadow-purple-900/10 transition-all border border-purple-400/20"
            style={{
                background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 45%, #9333EA 75%, #C026D3 100%)',
            }}
        >
            {/* Background Decorative Ambient Circles */}
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-pink-500/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col">
                {/* Header row with Badge & Icon */}
                <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 shadow-xs">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#FBBF24" className="shrink-0">
                            <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z" />
                        </svg>
                        <span className="text-white font-extrabold text-[10.5px] uppercase tracking-wider">
                            {isPremium ? 'Active Member' : 'VIP Membership'}
                        </span>
                    </div>

                    <span className="text-[11px] font-semibold text-white/90 bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        {isPremium ? 'VIP Active' : 'From ₹199'}
                    </span>
                </div>

                {/* Main Heading & Subtitle */}
                <div className="mt-3 text-left">
                    <h4 className="text-[16.5px] font-extrabold text-white tracking-tight leading-snug">
                        {isPremium ? 'Enjoying Premium Perks' : 'Supercharge Your Dating Life'}
                    </h4>
                    <p className="text-[12px] font-medium text-purple-100/90 mt-0.5 leading-relaxed">
                        {isPremium
                            ? 'You have full access to all exclusive VIP features and boost perks.'
                            : 'Get 5x more matches, see who likes you & unlock unlimited connections.'}
                    </p>
                </div>

                {/* Feature Tags / Highlights */}
                <div className="grid grid-cols-2 gap-1.5 my-3.5">
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-2.5 py-1.5 rounded-[12px] border border-white/10">
                        <span className="text-[13px]">💖</span>
                        <span className="text-[11px] font-semibold text-white truncate">Unlimited Likes</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-2.5 py-1.5 rounded-[12px] border border-white/10">
                        <span className="text-[13px]">👀</span>
                        <span className="text-[11px] font-semibold text-white truncate">See Who Likes You</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-2.5 py-1.5 rounded-[12px] border border-white/10">
                        <span className="text-[13px]">⚡</span>
                        <span className="text-[11px] font-semibold text-white truncate">1 Free Boost</span>
                    </div>
                </div>

                {/* Upgrade Button */}
                <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="w-full h-[44px] rounded-full bg-white text-[#703DE2] hover:bg-purple-50 active:scale-[0.98] transition-all font-extrabold text-[13.5px] shadow-md shadow-purple-950/20 cursor-pointer border-0 flex items-center justify-center gap-1.5 tracking-wide"
                >
                    <span>{isPremium ? 'Manage Membership' : 'Upgrade to Premium'}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
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
                    if (res.data.user.boostUntil) {
                        localStorage.setItem('hemsely_boost_until', res.data.user.boostUntil);
                    }
                }
            } catch {
                // Silent catch for profile fetch
            }
        };

        fetchUserProfile();
    }, []);

    const handleBoostExpired = useCallback(() => {
        setUserProfile((prev) => ({
            ...prev,
            isBoosted: false,
            boostUntil: null,
        }));
    }, []);

    const {
        isBoostActive,
        formattedRemaining,
        boostText,
        activateBoostState,
    } = useProfileBoost(userProfile, handleBoostExpired);

    const handleUseBoost = async () => {
        if (boosting || isBoostActive) return;
        setBoosting(true);
        try {
            const { data, ok } = await apiClient.post('/users/boost/activate');
            if (ok && data?.success) {
                setUserProfile(data.user);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.boostUntil || data.user?.boostUntil) {
                    activateBoostState(data.boostUntil || data.user.boostUntil);
                }
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

        // Dynamic Completion Percentage based on full profile strength formula
        const interests = (userProfile.interests && userProfile.interests.length > 0)
            ? userProfile.interests
            : (() => {
                try {
                    return JSON.parse(localStorage.getItem('onboarding_interests:v1') || '[]');
                } catch {
                    return [];
                }
            })();

        const completionPercentage = calculateProfileStrength({
            profilePicture: photo,
            galleryImages: userProfile.galleryImages || [],
            interests,
            prompts: userProfile.prompts || [],
            bio: userProfile.bio || '',
            education: userProfile.education || '',
            religion: userProfile.religion || '',
            profession: userProfile.profession || '',
            company: userProfile.company || '',
            height: userProfile.height,
            languages: userProfile.languages,
            relationshipGoal: userProfile.relationshipGoal,
            drinkingStatus: userProfile.drinkingStatus,
            smokingStatus: userProfile.smokingStatus,
        });

        const isSelfieVerified = userProfile.selfieStatus === 'approved' || (Boolean(userProfile.isVerified) && !userProfile.selfieStatus);

        const isUserPremium = Boolean(
            userProfile.isPremium ||
            userProfile.subscriptionName === 'Premium' ||
            userProfile.isSuperPremium ||
            userProfile.isSuperUser ||
            userProfile.isSuperSubscriber
        );

        return {
            name,
            age,
            photo,
            completionPercentage,
            isVerified: isSelfieVerified,
            isPremium: isUserPremium,
        };
    }, [userProfile]);

    return (
        <div
            className="h-[100dvh] flex flex-col max-w-[414px] mx-auto overflow-hidden"
            style={{ background: '#FCFCFC' }}
        >
            <ProfileHeaderBar />

            <main className="flex-1 flex flex-col justify-start overflow-y-auto px-4 pt-6 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    isBoostActive={isBoostActive}
                    formattedRemaining={formattedRemaining}
                    boostText={boostText}
                />
                <PremiumOfferCard
                    isPremium={profileState.isPremium}
                    onUpgradeClick={() => navigate('/premium')}
                />

                {/* Settings Option Below Blue Card */}
                <section className="mt-4 mb-2 w-full shrink-0">
                    <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="w-full text-left px-4 py-3.5 rounded-[20px] bg-white border border-gray-100 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer shadow-2xs hover:border-purple-200 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#F4EFFE] flex items-center justify-center shrink-0 group-hover:bg-[#ECE4FD] transition-colors">
                                <img src={settingIcon} alt="" className="w-5 h-5 object-contain" />
                            </div>
                            <div>
                                <p className="font-extrabold text-[14px] text-gray-900 leading-tight">Settings</p>
                                <p className="text-[11.5px] text-gray-500 font-medium mt-0.5">Account, privacy & preferences</p>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center text-gray-400 group-hover:text-[#703DE2] transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </button>
                </section>
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
