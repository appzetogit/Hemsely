import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Import assets from local folder
import centerImage from '../assets/853e31e910922fe7f47f66de5c5206f78a610037.jpg';
import avatarTopRed from '../assets/6ee1ef9d2677e06049fb899a7658f4b9ac9c11dc.jpg';
import avatarRightBeard from '../assets/a4e07912a9df7e2f14bba65dd13433a5d9fc0f9b.png';
import avatarBottomRightSmall from '../assets/9bd108315ddebf58571ec9fe25c0a6d5d63096ba.png';
import avatarBottomDark from '../assets/2d480a64955b32a3f343496aa510b7c06b62c97c.png';
import avatarLeftDenim from '../assets/cb6000111458728947d5516dee724f449f4d81e2.png';

const LoginScreen = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    const handlePhoneLoginClick = () => {
        navigate('/phone-input');
    };

    if (!loading && user && localStorage.getItem('token')) {
        return <Navigate to="/discovery" replace />;
    }

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between items-center py-6 px-6 font-sans overflow-hidden max-w-[420px] mx-auto select-none">
            {/* Header Text */}
            <div className="mt-2 text-center shrink-0">
                <h2 className="text-[30px] leading-[1.15] font-bold text-black tracking-tight">
                    Find <span className="text-[#FF8878]">your</span>
                    <br />
                    <span className="text-[#FF8878]">best</span> match
                </h2>
            </div>

            {/* Central Graphic Container */}
            <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center my-auto shrink-0">

                {/* 1. Outer Orbit Ring (Dashed) */}
                <div className="absolute w-[94%] h-[94%] border-[2px] border-dashed border-[#AAA0CF] rounded-full"></div>

                {/* 2. Inner Orbit Ring (Solid/Glow) */}
                <div className="absolute w-[70%] h-[70%] bg-[#F4F0FD] border border-purple-100 rounded-full"></div>

                {/* 3. Main Image - Center */}
                <div className="relative w-[42%] h-[42%] rounded-full overflow-hidden border-[4px] border-white shadow-xl z-20">
                    <img
                        src={centerImage}
                        className="w-full h-full object-cover"
                        alt="Couple"
                    />
                </div>

                {/* 4. Outer Satellites Container */}
                <div className="absolute w-[94%] h-[94%] inset-0 m-auto z-10 pointer-events-none">

                    {/* Top Right: Location Icon */}
                    <div className="absolute top-[12%] left-[82%] -translate-x-1/2 -translate-y-1/2 w-[36px] h-[36px] rounded-full bg-[#733FE0] flex items-center justify-center border-[2.5px] border-white shadow-md text-white">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                    </div>

                    {/* Right: Man Beard */}
                    <div className="absolute top-[67%] left-[97%] -translate-x-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full border-2 border-white overflow-hidden shadow-md bg-white">
                        <img src={avatarRightBeard} className="w-full h-full object-cover" alt="User" />
                    </div>

                    {/* Bottom Right: Small Woman */}
                    <div className="absolute top-[91%] left-[78%] -translate-x-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-full border-2 border-white overflow-hidden shadow-md bg-white">
                        <img src={avatarBottomRightSmall} className="w-full h-full object-cover" alt="User" />
                    </div>

                    {/* Bottom Left: Chat Icon */}
                    <div className="absolute top-[85%] left-[15%] -translate-x-1/2 -translate-y-1/2 w-[38px] h-[38px] rounded-full bg-[#733FE0] flex items-center justify-center border-[2.5px] border-white shadow-md text-white">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" /></svg>
                    </div>

                    {/* Left: Man Denim */}
                    <div className="absolute top-1/2 left-[10px] -translate-x-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-full border-2 border-white overflow-hidden shadow-md bg-white">
                        <img src={avatarLeftDenim} className="w-full h-full object-cover" alt="User" />
                    </div>
                </div>

                {/* 5. Inner Satellites Container */}
                <div className="absolute w-[70%] h-[70%] inset-0 m-auto z-10 pointer-events-none">
                    {/* Top: Woman Red */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[40px] rounded-full border-2 border-white overflow-hidden shadow-md bg-white">
                        <img src={avatarTopRed} className="w-full h-full object-cover" alt="User" />
                    </div>

                    {/* Bottom: Woman Dark */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full border-2 border-white overflow-hidden shadow-md bg-white">
                        <img src={avatarBottomDark} className="w-full h-full object-cover" alt="User" />
                    </div>
                </div>

            </div>

            {/* Actions Section */}
            <div className="w-full flex flex-col items-center shrink-0 mb-4">
                <button
                    type="button"
                    onClick={handlePhoneLoginClick}
                    className="w-full bg-[#733FE0] text-white font-bold h-[54px] rounded-[27px] text-[16px] shadow-lg hover:bg-[#6533c9] active:scale-[0.98] transition-colors"
                >
                    Login using phone number
                </button>
            </div>
        </div>
    );
};

export default LoginScreen;
