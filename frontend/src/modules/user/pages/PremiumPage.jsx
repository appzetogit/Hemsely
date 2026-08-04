import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setStored } from '../constants/discoveryData';
import apiClient from '../../../shared/services/apiClient';
import { loadRazorpayScript } from '../../../shared/utils/razorpayLoader';
import SubscriptionSuccessModal from '../components/SubscriptionSuccessModal';

const DEFAULT_FEATURES = [
    'Unlimited Likes',
    'Location Changes (Passport Mode)',
    'View Who Likes You',
    'Unlimited Rewinds',
    '1 Profile Boost per week',
    'Advanced Filters',
    'Priority Profile Visibility',
];

const PremiumPage = () => {
    const navigate = useNavigate();
    const [plan, setPlan] = useState({
        _id: null,
        name: 'Premium',
        price: 499,
        durationDays: 30,
        features: DEFAULT_FEATURES,
    });
    const [subscribing, setSubscribing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successDetails, setSuccessDetails] = useState(null);

    useEffect(() => {
        apiClient.get('/users/plans').then(({ data }) => {
            if (data && data.success && Array.isArray(data.plans) && data.plans.length > 0) {
                setPlan(data.plans[0]);
            }
        }).catch(() => {});
    }, []);

    const handleSubscribe = async () => {
        setSubscribing(true);
        try {
            // 1. Create Razorpay order on backend
            const { data, ok } = await apiClient.post('/subscriptions/create-order', { planId: plan._id });
            if (!ok || !data || !data.success) {
                alert(data?.message || 'Could not initiate Razorpay payment order');
                setSubscribing(false);
                return;
            }

            // 2. Load Razorpay SDK
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                alert('Razorpay SDK failed to load. Please check your internet connection.');
                setSubscribing(false);
                return;
            }

            // 3. Open Razorpay Checkout Modal
            const options = {
                key: data.key,
                amount: data.amount,
                currency: data.currency || 'INR',
                name: 'Hemsely',
                description: `${data.plan?.name || 'Premium'} Subscription`,
                order_id: data.orderId,
                prefill: {
                    name: data.userDetails?.name || '',
                    email: data.userDetails?.email || '',
                    contact: data.userDetails?.phone || '',
                },
                notes: {
                    transactionId: data.transactionId,
                    subscriptionId: data.subscriptionId,
                },
                handler: async function (response) {
                    try {
                        // Verify payment signature on backend
                        const verifyRes = await apiClient.post('/subscriptions/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            transactionId: data.transactionId,
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
                                transactionId: data.transactionId,
                                subscriptionId: data.subscriptionId,
                            });
                            setShowSuccessModal(true);
                        } else {
                            alert(verifyRes.data?.message || 'Payment verification failed');
                        }
                    } catch (err) {
                        alert('Error verifying payment with server');
                    } finally {
                        setSubscribing(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setSubscribing(false);
                    },
                },
                theme: {
                    color: '#703DE2',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                console.error('Razorpay payment failed:', response.error);
                alert(`Payment Failed: ${response.error?.description || 'Transaction cancelled'}`);
                setSubscribing(false);
            });
            rzp.open();
        } catch (err) {
            console.error('Error starting subscription checkout:', err);
            alert('An unexpected error occurred. Please try again.');
            setSubscribing(false);
        }
    };

    const featuresList = plan.features?.length ? plan.features : DEFAULT_FEATURES;

    return (
        <div className="h-[100dvh] flex flex-col justify-between max-w-[414px] mx-auto bg-white px-4 pt-2 pb-4 font-sans relative overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none">
            
            {/* Top Bar / Close Button */}
            <div className="flex justify-end w-full pt-1 mb-1">
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
                <p className="text-[11.5px] text-gray-500 font-normal text-center max-w-[270px] mx-auto leading-relaxed mb-4">
                    {plan.description || 'Upgrade to premium and quickly find new people in your area and chat without having to match first!'}
                </p>

                {/* Single Premium Pricing Card */}
                <div className="w-full mb-4">
                    <div className="relative flex items-center justify-between p-4 rounded-[20px] bg-gradient-to-r from-[#703DE2] to-[#9360F7] text-white shadow-md">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                                {plan.durationDays ? `${plan.durationDays} DAYS PASS` : 'MONTHLY'}
                            </span>
                            <h3 className="text-lg font-bold mt-1">{plan.name || 'Premium'}</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black">₹{plan.price}</span>
                        </div>
                    </div>
                </div>

                {/* What's Included / Pro Box */}
                <div className="w-full rounded-[20px] border border-[#703DE2] overflow-hidden bg-[#FAF8FE] mb-4 shadow-2xs">
                    <div className="bg-[#703DE2] text-white px-4.5 py-2.5 flex items-center justify-between">
                        <span className="font-bold text-[13px]">Whats included</span>
                        <span className="font-bold text-[13px]">Pro</span>
                    </div>

                    <div className="divide-y divide-purple-100/70 px-4 py-1">
                        {featuresList.map((feature, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2 px-0.5">
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

            </div>

            {/* Bottom Subscribe Button */}
            <div className="w-full pt-1">
                <button
                    type="button"
                    disabled={subscribing}
                    onClick={handleSubscribe}
                    className="w-full h-[45px] rounded-full bg-[#703DE2] hover:bg-[#602ec3] text-white font-extrabold text-[13px] uppercase tracking-wider shadow-md shadow-purple-200/80 cursor-pointer active:scale-[0.98] transition-all border-0 flex items-center justify-center disabled:opacity-50"
                >
                    {subscribing ? 'SUBSCRIBING...' : 'SUBSCRIBE NOW'}
                </button>
            </div>

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
    );
};

export default PremiumPage;
