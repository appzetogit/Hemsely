import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';

const PHONE_STORAGE_KEY = 'onboarding_phone:v1';

const PhoneInputPage = () => {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!phone || phone.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        setError('');

        const countryCode = '+91';
        const fullPhone = `${countryCode}${phone}`;

        try {
            const { data, ok } = await apiClient.post('auth/send-otp', {
                phoneNumber: fullPhone,
                phone: phone,
                fullPhone: fullPhone,
            });

            if (ok && data.success) {
                localStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify({
                    countryCode,
                    phone,
                    fullPhone,
                }));
                navigate('/verify');
            } else {
                setError(data.message || 'Failed to send OTP. Please try again.');
            }
        } catch {
            // Local fallback
            localStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify({
                countryCode,
                phone,
                fullPhone,
            }));
            navigate('/verify');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-6 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar */}
            <div className="flex items-center justify-between w-full pt-2">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate('/login')}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full my-auto px-2">
                {/* Title */}
                <h2 className="text-[28px] leading-tight font-extrabold text-black mb-3 text-center tracking-tight">
                    Enter your number
                </h2>

                {/* Subtitle */}
                <p className="text-[14px] text-gray-500 text-center mb-9 leading-relaxed font-normal max-w-[300px]">
                    Please enter your valid phone number.<br />
                    We will send you a 6-digit code to verify
                </p>

                {/* Input Container - Fully Rounded Pill */}
                <div className={`w-full h-[54px] border-[1.5px] ${error ? 'border-red-400' : 'border-[#6E36E4]'} rounded-full flex items-center px-6 relative bg-white shadow-sm transition-colors focus-within:border-[#6E36E4]`}>
                    <input
                        id="phone-input"
                        type="tel"
                        aria-label="Phone number"
                        value={phone}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setError('');
                            if (val.length <= 10) setPhone(val);
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-[17px] font-semibold text-gray-900 tracking-wider w-full placeholder:text-gray-300 placeholder:font-normal text-center"
                        placeholder="Enter phone number"
                    />
                </div>

                {error && (
                    <p className="w-full text-center text-[13px] text-red-500 font-medium mt-3 px-2">
                        {error}
                    </p>
                )}
            </div>

            {/* Continue Button */}
            <div className="w-full shrink-0 mb-4">
                <button
                    type="button"
                    disabled={loading || phone.length < 10}
                    onClick={handleContinue}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[54px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? 'Sending OTP...' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

export default PhoneInputPage;
