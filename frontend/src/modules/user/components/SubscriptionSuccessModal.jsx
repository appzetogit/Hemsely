import React, { useEffect, useState } from 'react';

const CONFETTI_PARTICLES = Array.from({ length: 32 }).map((_, i) => ({
    id: i,
    color: ['#FFD700', '#733FE0', '#FF4B91', '#00E5FF', '#FF9100', '#E040FB'][i % 6],
    left: `${Math.random() * 90 + 5}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${1.8 + Math.random() * 1.5}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
}));

const SubscriptionSuccessModal = ({ details, onClose }) => {
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimateIn(true), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-500 max-w-[420px] mx-auto ${
                animateIn ? 'opacity-100 backdrop-blur-md bg-black/80' : 'opacity-0 bg-black/0'
            }`}
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {/* CSS Animation Keyframes */}
            <style>{`
                @keyframes particleFall {
                    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(350px) rotate(720deg); opacity: 0; }
                }
                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(115, 63, 224, 0.8)); }
                    50% { transform: scale(1.08); filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.9)); }
                }
                @keyframes sparklePop {
                    0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.6; }
                    50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
                }
            `}</style>

            {/* Confetti Particle Stream */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {CONFETTI_PARTICLES.map((p) => (
                    <div
                        key={p.id}
                        style={{
                            position: 'absolute',
                            left: p.left,
                            top: '5%',
                            width: p.size,
                            height: p.size,
                            backgroundColor: p.color,
                            borderRadius: p.id % 2 === 0 ? '50%' : '2px',
                            transform: `rotate(${p.rotate})`,
                            animation: `particleFall ${p.duration} ease-out ${p.delay} infinite`,
                        }}
                    />
                ))}
            </div>

            {/* Main Modal Card */}
            <div
                className={`w-full bg-gradient-to-b from-[#1E1738] via-[#16102B] to-[#0D091B] border border-purple-500/30 rounded-[32px] p-7 text-center text-white shadow-2xl relative overflow-hidden transition-all duration-500 transform ${
                    animateIn ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
                }`}
            >
                {/* Background Ambient Glow */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#733FE0]/30 rounded-full blur-3xl pointer-events-none" />

                {/* Animated Floating Crown Icon */}
                <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
                    <div
                        className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#733FE0] to-[#FFD700] p-[2px] shadow-2xl"
                        style={{ animation: 'pulseGlow 2.5s ease-in-out infinite' }}
                    >
                        <div className="w-full h-full bg-[#16102B] rounded-full flex items-center justify-center">
                            {/* Crown SVG */}
                            <svg width="42" height="42" viewBox="0 0 24 24" fill="url(#goldGrad)" stroke="none">
                                <defs>
                                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#FFE066" />
                                        <stop offset="100%" stopColor="#F59E0B" />
                                    </linearGradient>
                                </defs>
                                <path d="M2 4l3 12h14l3-12-6 7-4-8-4 8-6-7zm3 14h14v2H5v-2z" />
                            </svg>
                        </div>
                    </div>

                    {/* Sparkle Stars */}
                    <div className="absolute -top-1 -right-1 text-amber-300 text-xl" style={{ animation: 'sparklePop 1.5s infinite' }}>✦</div>
                    <div className="absolute -bottom-1 -left-1 text-purple-300 text-lg" style={{ animation: 'sparklePop 2s infinite 0.5s' }}>★</div>
                </div>

                {/* Status Pill */}
                <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 text-[12px] font-extrabold tracking-widest uppercase mb-3 shadow-sm">
                    <span>🎉</span> PREMIUM UNLOCKED
                </div>

                {/* Main Headline */}
                <h2 className="text-[24px] font-extrabold text-white leading-tight mb-2 tracking-tight">
                    Welcome to Premium!
                </h2>

                {/* Subtitle */}
                <p className="text-[13.5px] text-purple-200/80 mb-6 leading-relaxed">
                    Your subscription is now active! Enjoy unlimited likes, see who likes you, priority visibility, and much more.
                </p>

                {/* Transaction Details Box */}
                {details?.transactionId && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-6 text-left text-[11.5px] text-gray-300 flex flex-col gap-1 backdrop-blur-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400 font-medium">Transaction ID:</span>
                            <span className="font-mono font-bold text-purple-300">{details.transactionId}</span>
                        </div>
                        {details?.subscriptionId && (
                            <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Subscription ID:</span>
                                <span className="font-mono text-gray-300">{details.subscriptionId}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Features Check List */}
                <div className="flex justify-center items-center gap-4 text-[12px] text-purple-100 font-semibold mb-7">
                    <span className="flex items-center gap-1">✓ Unlimited Likes</span>
                    <span className="flex items-center gap-1">✓ Unlocked Likes</span>
                    <span className="flex items-center gap-1">✓ Priority Boost</span>
                </div>

                {/* Start Exploring Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#733FE0] via-[#8B5CF6] to-[#A855F7] hover:from-[#6231cc] hover:to-[#9333EA] text-white font-extrabold text-[15px] uppercase tracking-wider shadow-lg shadow-purple-950/80 border-0 cursor-pointer active:scale-95 transition-all"
                >
                    START EXPLORING
                </button>
            </div>
        </div>
    );
};

export default SubscriptionSuccessModal;
