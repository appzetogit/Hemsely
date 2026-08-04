import React, { useEffect, useState } from 'react';

const BoostAnimationOverlay = ({ onClose }) => {
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimateIn(true), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            className={`fixed inset-0 z-[9999] max-w-[420px] mx-auto bg-gradient-to-b from-[#1E1738] via-[#16102B] to-[#0D091B] transition-opacity duration-500 ${
                animateIn ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <style>{`
                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(255, 145, 0, 0.8)); }
                    50% { transform: scale(1.08); filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.9)); }
                }
                @keyframes ripple {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
            `}</style>

            {/* Full-page content */}
            <div
                className={`w-full h-full flex flex-col items-center justify-center px-7 text-center text-white relative overflow-hidden transition-all duration-500 transform ${
                    animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                }`}
            >
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF6B4A]/30 rounded-full blur-3xl pointer-events-none" />

                <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
                    {/* Ripple rings */}
                    <span className="absolute w-20 h-20 rounded-full border-2 border-[#FFA733]" style={{ animation: 'ripple 2s ease-out infinite' }} />
                    <span className="absolute w-20 h-20 rounded-full border-2 border-[#FFA733]" style={{ animation: 'ripple 2s ease-out 1s infinite' }} />

                    <div
                        className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFD700] p-[2px] shadow-2xl flex items-center justify-center"
                        style={{ animation: 'pulseGlow 2.5s ease-in-out infinite' }}
                    >
                        <div className="w-full h-full bg-[#16102B] rounded-full flex items-center justify-center text-4xl">
                            🚀
                        </div>
                    </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 text-[12px] font-extrabold tracking-widest uppercase mb-3 shadow-sm">
                    <span>🎆</span> BOOST ACTIVE
                </div>

                <h2 className="text-[22px] font-extrabold text-white leading-tight mb-2 tracking-tight">
                    🚀 PROFILE BOOST ACTIVATED!
                </h2>

                <p className="text-[13.5px] text-purple-200/80 mb-7 leading-relaxed">
                    Your profile is now 20x more visible to compatible matches!
                </p>

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#FF6B4A] via-[#FF8A5C] to-[#FFA733] hover:from-[#e85e3f] hover:to-[#e8901f] text-white font-extrabold text-[15px] uppercase tracking-wider shadow-lg shadow-orange-950/50 border-0 cursor-pointer active:scale-95 transition-all"
                >
                    LET'S GO
                </button>
            </div>
        </div>
    );
};

export default BoostAnimationOverlay;
