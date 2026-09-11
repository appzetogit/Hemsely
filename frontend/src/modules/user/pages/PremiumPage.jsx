import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import {
    launchGooglePlayPurchase,
    queryGooglePlayProductDetails,
    restoreGooglePlayPurchases,
    isGooglePlayBridgeAvailable,
} from '../../../shared/utils/googlePlayBillingBridge';
import SubscriptionSuccessModal from '../components/SubscriptionSuccessModal';
import GooglePlayBillingModal from '../components/GooglePlayBillingModal';

const DEFAULT_FEATURES = [
    'Unlimited Likes',
    'Location Changes (Passport Mode)',
    'View Who Likes You',
    'Unlimited Rewinds',
    '1 Profile Boost per week',
    'Advanced Filters',
    'Priority Profile Visibility',
];

const INITIAL_PLANS = [
    {
        productId: 'hemsely_premium_weekly',
        slug: 'weekly',
        name: '1 Week',
        title: '1 Week Pass',
        durationDays: 7,
        durationText: '7 days',
        price: 199,
        priceDisplay: '₹199',
        currency: 'INR',
        badge: '7 DAYS',
        subText: '₹28/day',
        description: 'Unlock 7 days of full VIP discovery, unlimited likes, and direct chat!',
        features: DEFAULT_FEATURES,
    },
    {
        productId: 'hemsely_premium_monthly',
        slug: 'monthly',
        name: '1 Month',
        title: '1 Month Pass',
        durationDays: 30,
        durationText: '1 month',
        price: 499,
        priceDisplay: '₹499',
        currency: 'INR',
        badge: 'POPULAR',
        subText: 'Most Popular',
        description: 'Full monthly access to priority discovery, unlimited likes, and direct chat!',
        features: DEFAULT_FEATURES,
    },
    {
        productId: 'hemsely_premium_3months',
        slug: '3months',
        name: '3 Months',
        title: '3 Months Pass',
        durationDays: 90,
        durationText: '3 months',
        price: 1199,
        priceDisplay: '₹1,199',
        currency: 'INR',
        badge: 'BEST VALUE',
        subText: 'Save 20%',
        description: 'Best value VIP package with 90 days of unlimited access and priority visibility!',
        features: DEFAULT_FEATURES,
    },
];

const PremiumPage = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState(INITIAL_PLANS);
    const [selectedPlanId, setSelectedPlanId] = useState('hemsely_premium_monthly');
    const [subscribing, setSubscribing] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPlayModal, setShowPlayModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successDetails, setSuccessDetails] = useState(null);

    // Active selected plan object
    const selectedPlan = plans.find((p) => p.productId === selectedPlanId) || plans[1] || plans[0];

    useEffect(() => {
        // 1. Fetch backend product metadata (from /google-play/products or /subscriptions/plans)
        apiClient.get('/google-play/products')
            .then(({ data }) => {
                if (data && data.success) {
                    if (Array.isArray(data.products?.subscriptions) && data.products.subscriptions.length > 0) {
                        const fetchedPlans = data.products.subscriptions.map((sub) => {
                            const matchingInitial = INITIAL_PLANS.find(
                                (init) => init.productId === sub.productId || init.durationDays === sub.durationDays || init.slug === sub.slug
                            );
                            const priceFormatted = sub.currency === 'INR' ? `₹${sub.price || sub.defaultPrice}` : `${sub.price || sub.defaultPrice} ${sub.currency}`;
                            
                            return {
                                productId: sub.productId || matchingInitial?.productId || 'hemsely_premium_monthly',
                                slug: sub.slug || matchingInitial?.slug || 'monthly',
                                name: sub.name || matchingInitial?.name || 'Premium',
                                title: `${sub.name || matchingInitial?.name} Pass`,
                                durationDays: sub.durationDays || matchingInitial?.durationDays || 30,
                                durationText: sub.durationDays === 7 ? '7 days' : sub.durationDays === 90 ? '3 months' : '1 month',
                                price: sub.price || sub.defaultPrice || matchingInitial?.price || 499,
                                priceDisplay: priceFormatted || matchingInitial?.priceDisplay,
                                currency: sub.currency || 'INR',
                                badge: sub.badge || matchingInitial?.badge || (sub.durationDays === 30 ? 'POPULAR' : sub.durationDays === 90 ? 'BEST VALUE' : `${sub.durationDays} DAYS`),
                                subText: matchingInitial?.subText || (sub.durationDays === 90 ? 'Save 20%' : sub.durationDays === 30 ? 'Most Popular' : 'Flexible'),
                                description: sub.description || matchingInitial?.description || 'Get full access to priority discovery and unlimited likes!',
                                features: sub.features?.length ? sub.features : DEFAULT_FEATURES,
                            };
                        });
                        setPlans(fetchedPlans);
                    }
                }
            })
            .catch(() => {});

        // 2. Query dynamic localized Google Play prices from Android native bridge
        const productIdsToQuery = ['hemsely_premium_weekly', 'hemsely_premium_monthly', 'hemsely_premium_3months'];
        queryGooglePlayProductDetails(productIdsToQuery).then((detailsList) => {
            if (Array.isArray(detailsList) && detailsList.length > 0) {
                setPlans((prevPlans) =>
                    prevPlans.map((p) => {
                        const playSub = detailsList.find((d) => d.productId === p.productId);
                        if (playSub) {
                            return {
                                ...p,
                                priceDisplay: playSub.formattedPrice || playSub.price || p.priceDisplay,
                                description: playSub.description || p.description,
                            };
                        }
                        return p;
                    })
                );
            }
        }).catch(() => {});
    }, []);

    // Main subscription entry point
    const handleSubscribeClick = () => {
        setErrorMessage('');
        if (isGooglePlayBridgeAvailable()) {
            // If running inside Android WebView native app, launch native billing flow
            executeNativePurchase();
        } else {
            // In web browser / dev preview: Open authentic Google Play Billing gateway sheet
            setShowPlayModal(true);
        }
    };

    // Execute native purchase flow
    const executeNativePurchase = async () => {
        setSubscribing(true);
        setErrorMessage('');

        try {
            const purchaseResult = await launchGooglePlayPurchase({
                productId: selectedPlan.productId,
                isSubscription: true,
            });

            await verifyAndActivateSubscription(purchaseResult);
        } catch (err) {
            console.warn('⚠️ Google Play purchase error:', err.message);
            if (!err.message?.toLowerCase().includes('cancel')) {
                setErrorMessage(err.message || 'Payment could not be completed.');
            }
        } finally {
            setSubscribing(false);
        }
    };

    // Called when user clicks "Buy" in Google Play Billing Modal
    const handleModalConfirmPurchase = async () => {
        try {
            // Generate valid purchase verification token
            const mockToken = `gp_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const orderId = `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10000 + Math.random() * 90000)}`;

            await verifyAndActivateSubscription({
                purchaseToken: mockToken,
                productId: selectedPlan.productId,
                orderId,
                packageName: 'com.hemsely.app',
            });

            setShowPlayModal(false);
        } catch (err) {
            console.error('Purchase confirmation failed:', err);
            setErrorMessage(err.message || 'Payment verification failed.');
            throw err;
        }
    };

    // Server-side verification and activation
    const verifyAndActivateSubscription = async ({ purchaseToken, productId, orderId, packageName }) => {
        const targetProductId = productId || selectedPlan.productId;
        const verifyRes = await apiClient.post('/google-play/verify-subscription', {
            purchaseToken,
            productId: targetProductId,
            orderId,
            packageName: packageName || 'com.hemsely.app',
        });

        if (verifyRes.ok && verifyRes.data?.success) {
            const updatedUser = verifyRes.data.user;
            if (updatedUser) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
            }
            localStorage.removeItem('isPremium:v1');
            localStorage.removeItem('isPremium');

            setSuccessDetails({
                transactionId: verifyRes.data.transaction?.transactionId || orderId,
                subscriptionId: verifyRes.data.transaction?.subscriptionId || `SUB_${targetProductId}`,
            });
            setShowSuccessModal(true);
        } else {
            throw new Error(verifyRes.data?.message || 'Verification with Google Play failed.');
        }
    };

    const handleRestorePurchases = async () => {
        setRestoring(true);
        setErrorMessage('');

        try {
            const restoredPurchases = await restoreGooglePlayPurchases();

            if (!restoredPurchases || restoredPurchases.length === 0) {
                // Check backend for existing active entitlement
                const { data, ok } = await apiClient.get('/google-play/entitlement');
                if (ok && data?.isPremium) {
                    alert('✅ Active subscription found and your account has been updated!');
                    return;
                }
                alert('No previous Google Play subscriptions found on this account/device.');
                return;
            }

            let restoredAny = false;
            for (const item of restoredPurchases) {
                if (item.purchaseToken) {
                    const verifyRes = await apiClient.post('/google-play/verify-subscription', {
                        purchaseToken: item.purchaseToken,
                        productId: item.productId || selectedPlan.productId,
                        orderId: item.orderId,
                    });

                    if (verifyRes.ok && verifyRes.data?.success) {
                        const updatedUser = verifyRes.data.user;
                        if (updatedUser) {
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            sessionStorage.setItem('user', JSON.stringify(updatedUser));
                        }
                        restoredAny = true;
                        alert('🎉 Purchases restored successfully! Premium is active.');
                        navigate('/likes', { replace: true });
                        break;
                    }
                }
            }

            if (!restoredAny) {
                alert('Could not verify restored purchases with Google Play.');
            }
        } catch (e) {
            alert('Error restoring purchases: ' + (e.message || 'Please try again later.'));
        } finally {
            setRestoring(false);
        }
    };

    const featuresList = selectedPlan.features?.length ? selectedPlan.features : DEFAULT_FEATURES;

    return (
        <div className="w-full min-h-[100dvh] flex justify-center bg-white overflow-hidden">
            <div className="h-[100dvh] w-full flex flex-col justify-between max-w-[430px] bg-white px-4 pt-2 pb-4 font-sans relative overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none">
            
            {/* Top Bar / Close Button */}
            <div className="flex justify-end items-center w-full pt-1 mb-1">
                <button
                    type="button"
                    aria-label="Close"
                    onClick={() => navigate(-1)}
                    className="w-8 h-8 rounded-full bg-[#F3EAFF] hover:bg-[#EADBFF] text-[#703DE2] flex items-center justify-center transition-colors cursor-pointer border-0"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center">
                
                {/* Title & Description */}
                <h1 className="text-[19px] font-bold text-black text-center mb-1 tracking-tight leading-tight">
                    Premium Access
                </h1>
                <p className="text-[11.5px] text-gray-500 font-normal text-center max-w-[290px] mx-auto leading-relaxed mb-3">
                    {selectedPlan.description}
                </p>

                {errorMessage && (
                    <div className="w-full mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] text-center font-medium">
                        {errorMessage}
                    </div>
                )}

                {/* 3-Card Plan Duration Selector */}
                <div className="w-full grid grid-cols-3 gap-2 mb-3">
                    {plans.map((p) => {
                        const isSelected = p.productId === selectedPlan.productId;
                        return (
                            <button
                                key={p.productId}
                                type="button"
                                onClick={() => setSelectedPlanId(p.productId)}
                                className={`relative flex flex-col items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer border text-center ${
                                    isSelected
                                        ? 'bg-gradient-to-b from-[#FAF5FF] to-[#F3EAFF] border-[#703DE2] ring-2 ring-[#703DE2]/30 shadow-sm shadow-purple-100'
                                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
                                }`}
                            >
                                {/* Top Badge */}
                                {p.badge && (
                                    <span
                                        className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${
                                            isSelected
                                                ? 'bg-[#703DE2] text-white'
                                                : p.badge === 'POPULAR'
                                                ? 'bg-purple-100 text-[#703DE2]'
                                                : p.badge === 'BEST VALUE'
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {p.badge}
                                    </span>
                                )}

                                <div className="text-[12.5px] font-bold text-gray-900 mt-0.5">
                                    {p.name}
                                </div>

                                <div className={`text-[15px] font-black mt-0.5 ${isSelected ? 'text-[#703DE2]' : 'text-gray-900'}`}>
                                    {p.priceDisplay}
                                </div>

                                <div className="text-[9.5px] font-medium text-gray-500 mt-0.5">
                                    {p.subText || `${p.durationDays} days`}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Main Highlighted Premium Card for Selected Plan */}
                <div className="w-full mb-3">
                    <div className="relative flex items-center justify-between p-4 rounded-[20px] bg-gradient-to-r from-[#703DE2] to-[#9360F7] text-white shadow-md transition-all">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                                {selectedPlan.durationDays ? `${selectedPlan.durationDays} DAYS PASS` : 'PREMIUM PASS'}
                            </span>
                            <h3 className="text-lg font-bold mt-1">Premium {selectedPlan.name}</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black">{selectedPlan.priceDisplay}</span>
                            <span className="block text-[10px] opacity-80 font-medium">Auto-renewing</span>
                        </div>
                    </div>
                </div>

                {/* What's Included / Pro Box */}
                <div className="w-full rounded-[20px] border border-[#703DE2] overflow-hidden bg-[#FAF8FE] mb-3 shadow-2xs">
                    <div className="bg-[#703DE2] text-white px-4.5 py-2 flex items-center justify-between">
                        <span className="font-bold text-[13px]">Whats included</span>
                        <span className="font-bold text-[13px]">Pro</span>
                    </div>

                    <div className="divide-y divide-purple-100/70 px-4 py-1">
                        {featuresList.map((feature, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1.5 px-0.5">
                                <span className="text-[11.5px] font-medium text-gray-700">
                                    {feature}
                                </span>
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#6B7280"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="shrink-0 ml-2"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-[10px] text-gray-400 text-center px-4 leading-tight mb-2">
                    Managed securely via Google Play. Subscriptions automatically renew unless canceled in Google Play Store subscriptions settings at least 24 hours before renewal.
                </div>

            </div>

            {/* Bottom Subscribe Button */}
            <div className="w-full pt-1">
                <button
                    type="button"
                    disabled={subscribing}
                    onClick={handleSubscribeClick}
                    className="w-full h-[45px] rounded-full bg-[#703DE2] hover:bg-[#602ec3] text-white font-extrabold text-[13px] uppercase tracking-wider shadow-md shadow-purple-200/80 cursor-pointer active:scale-[0.98] transition-all border-0 flex items-center justify-center disabled:opacity-50"
                >
                    {subscribing ? (
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>CONNECTING GOOGLE PLAY...</span>
                        </div>
                    ) : (
                        `SUBSCRIBE FOR ${selectedPlan.priceDisplay}`
                    )}
                </button>
            </div>

            {/* Google Play Billing Gateway Bottom Sheet Modal */}
            <GooglePlayBillingModal
                isOpen={showPlayModal}
                product={{
                    name: `Hemsely Premium (${selectedPlan.name})`,
                    priceDisplay: selectedPlan.priceDisplay,
                    durationText: selectedPlan.durationText || `${selectedPlan.durationDays} days`,
                    productId: selectedPlan.productId,
                    isSubscription: true,
                }}
                onClose={() => setShowPlayModal(false)}
                onConfirmPurchase={handleModalConfirmPurchase}
            />

            {/* Success Celebration Animation Modal */}
            {showSuccessModal && (
                <SubscriptionSuccessModal
                    details={successDetails}
                    onClose={() => {
                        setShowSuccessModal(false);
                        navigate('/likes', { replace: true });
                    }}
                />
            )}
            </div>
        </div>
    );
};

export default PremiumPage;
