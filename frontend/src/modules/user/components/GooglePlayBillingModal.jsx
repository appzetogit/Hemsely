import React, { useState } from 'react';

/**
 * Google Play Billing Gateway Bottom Sheet Modal
 * Renders the authentic Google Play purchase interface with payment methods,
 * localized prices, item details, and the official Google Play "Buy" action.
 */
const GooglePlayBillingModal = ({
    product = {
        name: 'Hemsely Premium',
        priceDisplay: '₹499.00',
        durationText: '1 month',
        productId: 'hemsely_premium_monthly',
        isSubscription: true,
    },
    isOpen = false,
    onClose,
    onConfirmPurchase,
}) => {
    const [selectedPayment, setSelectedPayment] = useState('upi');
    const [isProcessing, setIsProcessing] = useState(false);
    const [discountApplied, setDiscountApplied] = useState(false);

    if (!isOpen) return null;

    const handleBuy = async () => {
        setIsProcessing(true);
        try {
            await onConfirmPurchase({
                paymentMethod: selectedPayment,
                discountApplied,
            });
        } catch (e) {
            console.error('Purchase flow error:', e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px] transition-opacity animate-fade-in select-none">
            {/* Backdrop click dismiss */}
            <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />

            {/* Bottom Sheet Container */}
            <div className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up font-sans">
                
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-2.5 pb-1">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Google Play Header */}
                <div className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        {/* Google Play Multi-color Icon */}
                        <svg className="w-5 h-5" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.2 18.2C38.4 27.8 33.3 42.4 33.3 61v390c0 18.6 5.1 33.2 13.9 42.8l2.4 2.4L268.4 277.4v-5.8L49.6 15.8l-2.4 2.4z" fill="#00D3FF" />
                            <path d="M343.8 352.8l-75.4-75.4v-5.8l75.4-75.4 1.7 1 89.2 50.7c25.5 14.5 25.5 38.2 0 52.7l-89.2 50.7-1.7 1.5z" fill="#FFCF00" />
                            <path d="M345.5 351.3L268.4 274.2 47.2 495.4c8.4 8.9 22.3 9.9 38 1l260.3-145.1" fill="#FF3A44" />
                            <path d="M345.5 160.7L85.2 12.6C69.5 3.7 55.6 4.7 47.2 13.6L268.4 234.8l77.1-74.1z" fill="#00E676" />
                        </svg>
                        <span className="text-[17px] font-semibold text-gray-800 tracking-tight">Google Play</span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full text-sm font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Body Content */}
                <div className="px-5 py-3.5 flex-1 overflow-y-auto [scrollbar-width:none]">
                    
                    {/* Item Row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#703DE2] to-[#9360F7] flex items-center justify-center text-white shadow-sm shrink-0">
                                <span className="font-extrabold text-xl">H</span>
                            </div>
                            <div>
                                <h3 className="text-[16px] font-bold text-gray-900 leading-snug">
                                    {product.name || 'Hemsely Premium'}
                                </h3>
                                <p className="text-[12px] text-gray-500 font-medium">
                                    Hemsely Dating • {product.isSubscription ? 'Auto-renewing subscription' : 'In-App Purchase'}
                                </p>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="text-[18px] font-extrabold text-gray-900">
                                {product.priceDisplay || '₹499.00'}
                            </div>
                            {product.isSubscription && (
                                <span className="text-[10.5px] text-gray-400 block font-medium">
                                    /{product.durationText || 'month'}
                                </span>
                            )}
                        </div>
                    </div>



                    {/* Payment Methods Section */}
                    <div className="mb-3">
                        <span className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wider block mb-2 px-1">
                            Choose Payment Method
                        </span>

                        <div className="space-y-2">
                            {/* UPI Option */}
                            <label
                                onClick={() => setSelectedPayment('upi')}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                    selectedPayment === 'upi'
                                        ? 'border-[#1A73E8] bg-[#F8FAFF] shadow-xs'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-[11px] text-gray-700">
                                        UPI
                                    </div>
                                    <div>
                                        <div className="text-[13.5px] font-semibold text-gray-900">Pay with UPI</div>
                                        <div className="text-[11px] text-gray-500">Google Pay, PhonePe, Paytm, BHIM</div>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name="google_play_payment"
                                    checked={selectedPayment === 'upi'}
                                    onChange={() => setSelectedPayment('upi')}
                                    className="w-4 h-4 text-[#1A73E8] focus:ring-blue-500"
                                />
                            </label>

                            {/* Cards Option */}
                            <label
                                onClick={() => setSelectedPayment('card')}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                    selectedPayment === 'card'
                                        ? 'border-[#1A73E8] bg-[#F8FAFF] shadow-xs'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-[#1A1F71] text-white flex items-center justify-center font-extrabold text-[9px] tracking-tight">
                                        VISA
                                    </div>
                                    <div>
                                        <div className="text-[13.5px] font-semibold text-gray-900">Visa ending in •••• 6691</div>
                                        <div className="text-[11px] text-gray-500">Credit / Debit Card</div>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name="google_play_payment"
                                    checked={selectedPayment === 'card'}
                                    onChange={() => setSelectedPayment('card')}
                                    className="w-4 h-4 text-[#1A73E8] focus:ring-blue-500"
                                />
                            </label>

                            {/* Google Play Balance */}
                            <label
                                onClick={() => setSelectedPayment('balance')}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                    selectedPayment === 'balance'
                                        ? 'border-[#1A73E8] bg-[#F8FAFF] shadow-xs'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                        ₹
                                    </div>
                                    <div>
                                        <div className="text-[13.5px] font-semibold text-gray-900">Google Play Balance</div>
                                        <div className="text-[11px] text-emerald-600 font-medium">Balance: ₹500.00 Available</div>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name="google_play_payment"
                                    checked={selectedPayment === 'balance'}
                                    onChange={() => setSelectedPayment('balance')}
                                    className="w-4 h-4 text-[#1A73E8] focus:ring-blue-500"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Disclaimer / Terms text */}
                    <p className="text-[10.5px] text-gray-400 text-center leading-relaxed mt-3 mb-1">
                        Tap &quot;Buy&quot; to complete your purchase with Google Play. Subscriptions automatically renew. You can cancel at any time in Google Play subscriptions settings.
                    </p>

                </div>

                {/* Footer / Buy Button */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleBuy}
                        className="w-full h-[48px] rounded-full bg-[#0057FF] hover:bg-[#0047D0] active:scale-[0.99] text-white font-bold text-[15px] shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                        {isProcessing ? (
                            <>
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>PROCESSING WITH GOOGLE PLAY...</span>
                            </>
                        ) : (
                            <span>Buy</span>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default GooglePlayBillingModal;
