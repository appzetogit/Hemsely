import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeartIcon from '../components/HeartIcon';

const SplashScreen = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/login');
        }, 2500);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#6F3BCE] relative overflow-hidden">
            <div className="relative mb-6 flex items-center justify-center scale-90">
                <div className="relative -mr-1 transform -rotate-15">
                    <HeartIcon width={50} height={50} />
                </div>
                <div className="absolute top-3 left-8 transform rotate-15 translate-x-1 translate-y-1">
                    <HeartIcon width={28} height={28} />
                </div>
            </div>
            <h1 className="text-[64px] leading-[100%] font-semibold text-white tracking-[0.01em] text-center font-sans">
                Hemsely
            </h1>
            <p className="text-[20px] leading-[100%] font-semibold text-white tracking-[0.01em] text-center mt-[10px] w-[188px] font-sans">
                Online Dating App
            </p>
        </div>
    );
};

export default SplashScreen;
