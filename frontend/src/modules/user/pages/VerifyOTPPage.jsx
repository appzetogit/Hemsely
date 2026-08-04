import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../../../shared/services/apiClient';

const OTP_SLOTS = ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5', 'slot-6'];

const VerifyOTPPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [showBannedModal, setShowBannedModal] = useState(false);
    const inputRefs = useRef([]);

    const savedPhone = JSON.parse(
        localStorage.getItem('onboarding_phone:v1') ||
        localStorage.getItem('onboarding_phone') ||
        '{}'
    );

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    const handleResend = async () => {
        if (resendTimer > 0) return;
        setResendTimer(30);
        setError('');
        const targetPhone = savedPhone.fullPhone || `${savedPhone.countryCode || '+91'}${savedPhone.phone || ''}`;
        if (!targetPhone) return;

        try {
            await apiClient.post('auth/send-otp', { phoneNumber: targetPhone });
        } catch {
            // Suppress resend errors
        }
    };

    const handleSubmit = async () => {
        const enteredOtp = otp.join('');

        if (enteredOtp.length < 6) {
            setError('Please enter the complete 6-digit code.');
            return;
        }

        setLoading(true);
        setError('');

        const targetPhone = savedPhone.fullPhone || `${savedPhone.countryCode || '+91'}${savedPhone.phone || ''}`;

        try {
            const { data, ok } = await apiClient.post('auth/verify-otp', {
                phoneNumber: targetPhone,
                otp: enteredOtp,
            });

            if (ok && data.success) {
                const uId = data.user?.id || data.user?._id;
                const prevUserId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
                if (uId && prevUserId && uId !== prevUserId) {
                    ['onboarding_profile:v1', 'onboarding_photos:v1', 'onboarding_gender:v1', 'onboarding_interests:v1', 'onboarding_goals:v1', 'onboarding_cover_photo:v1', 'profile_complete:v1', 'profile_complete'].forEach(k => {
                        sessionStorage.removeItem(k);
                        localStorage.removeItem(k);
                    });
                }

                if (data.token) {
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('token', data.token);
                }
                if (data.refreshToken) {
                    sessionStorage.setItem('refreshToken', data.refreshToken);
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
                if (data.user) {
                    sessionStorage.setItem('userId', uId);
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                    sessionStorage.setItem('Hemsely_user:v1', JSON.stringify(data.user));
                    localStorage.setItem('userId', uId);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('Hemsely_user:v1', JSON.stringify(data.user));
                }

                login({
                    id: uId,
                    ...data.user,
                    phone: savedPhone.phone,
                    countryCode: savedPhone.countryCode || '+91',
                    isProfileComplete: data.isProfileComplete,
                });

                if (data.isProfileComplete) {
                    sessionStorage.setItem('profile_complete:v1', 'true');
                    localStorage.setItem('profile_complete:v1', 'true');
                    navigate('/discovery');
                } else {
                    sessionStorage.setItem('profile_complete:v1', 'false');
                    localStorage.setItem('profile_complete:v1', 'false');
                    navigate('/profile-details');
                }
                return;
            } else {
                const msg = (data?.message || '').toLowerCase();
                if (data?.isBanned || msg.includes('banned') || msg.includes('reported')) {
                    setError('');
                    setShowBannedModal(true);
                } else {
                    setError(data?.message || 'Invalid OTP code. Please try again.');
                }
            }
        } catch {
            setError('Could not reach the server. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto focus next input
        if (value !== '' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pastedData) return;
        const newOtp = ['', '', '', '', '', ''];
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        setError('');
        const nextIndex = Math.min(pastedData.length, 5);
        if (nextIndex < 6) {
            inputRefs.current[nextIndex]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'Enter') {
            const enteredOtp = otp.join('');
            if (enteredOtp.length === 6 && !loading) {
                handleSubmit();
            }
        }
    };

    const displayPhone = savedPhone.phone ? `${savedPhone.countryCode || '+91'} ${savedPhone.phone}` : 'your phone number';

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-6 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none">
            {/* Top Bar */}
            <div className="flex items-center justify-between w-full pt-2">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate('/phone-input')}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-black hover:bg-gray-50 transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full my-auto">
                {/* Title */}
                <h2 className="text-[30px] font-bold text-black mb-2 text-center tracking-tight">
                    Verify Code
                </h2>

                {/* Subtitle */}
                <p className="text-[14px] text-gray-500 text-center mb-10 leading-relaxed font-normal px-2">
                    Enter the 6-digit verification code sent to<br />
                    <span className="font-bold text-black">{displayPhone}</span>
                </p>

                {/* OTP Input Group - 6 Slots */}
                <div className="flex space-x-2 mb-8 justify-center w-full max-w-[320px] mx-auto">
                    {otp.map((digit, index) => (
                        <input
                            key={OTP_SLOTS[index]}
                            ref={el => inputRefs.current[index] = el}
                            type="text"
                            maxLength="1"
                            aria-label={`OTP digit ${index + 1}`}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className="w-[40px] h-[46px] border-[1.5px] border-[#733FE0] rounded-xl text-center text-[18px] font-bold text-black outline-none focus:shadow-md focus:border-[#5f2ebd] transition-colors bg-purple-50/20"
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-[13px] text-red-500 font-medium mb-6 text-center">
                        {error}
                    </p>
                )}

                {/* Resend Action */}
                <div className="text-center mb-4">
                    {resendTimer > 0 ? (
                        <p className="text-[14px] text-gray-400 font-medium">
                            Resend code in <span className="font-bold text-[#733FE0]">{resendTimer}s</span>
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            className="text-[14px] font-bold text-[#733FE0] hover:underline transition-opacity hover:opacity-80"
                        >
                            Resend OTP
                        </button>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <div className="w-full shrink-0 mb-2">
                <button
                    type="button"
                    disabled={loading || otp.join('').length < 6}
                    onClick={handleSubmit}
                    className="w-full bg-[#733FE0] text-white font-bold h-[56px] rounded-[28px] text-[16px] shadow-lg hover:bg-[#6434c8] active:scale-[0.98] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
            </div>

            {/* Banned Modal Popup */}
            {showBannedModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', maxWidth: '420px', margin: '0 auto',
                }}>
                    <div style={{
                        width: '100%', background: '#FFFFFF', borderRadius: '24px',
                        padding: '24px 20px', textAlign: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: '#FEE2E2', color: '#EF4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', fontSize: '26px',
                        }}>
                            🚫
                        </div>
                        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '20px', fontWeight: 700, color: '#18181B', margin: '0 0 8px' }}>
                            You are banned by Hemsely
                        </h2>
                        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13.5px', color: '#71717A', margin: '0 0 20px', lineHeight: '1.5' }}>
                            Your account has been restricted for violating Hemsely community guidelines.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowBannedModal(false)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                border: 'none', background: '#EF4444', color: '#FFFFFF',
                                fontFamily: "'Roboto', sans-serif", fontSize: '15px', fontWeight: 700,
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifyOTPPage;
