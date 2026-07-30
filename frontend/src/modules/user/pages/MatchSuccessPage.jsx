import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import staticGirlPhoto from '../assets/853e31e910922fe7f47f66de5c5206f78a610037.jpg';

const MatchSuccessPage = ({ 
    matchPhoto = null, 
    userName = null,
    onSayHello = null,
    onKeepSwiping = null
}) => {
    const navigate = useNavigate();

    // Read stored profile data if props not passed
    const storedName = React.useMemo(() => {
        if (userName) return userName;
        try {
            const profile = JSON.parse(localStorage.getItem('onboarding_profile:v1') || '{}');
            return profile.name || 'Jake';
        } catch {
            return 'Jake';
        }
    }, [userName]);

    const guyCardPhoto = matchPhoto || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600';

    const handleSayHello = () => {
        if (onSayHello) {
            onSayHello();
        } else {
            navigate('/discovery');
        }
    };

    const handleKeepSwiping = () => {
        if (onKeepSwiping) {
            onKeepSwiping();
        } else {
            navigate('/discovery');
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col justify-between py-6 px-6 font-sans max-w-[420px] mx-auto overflow-hidden relative select-none animate-in fade-in duration-300">
            {/* Top Space */}
            <div className="pt-2" />

            {/* Overlapping Tilted Cards Container */}
            <div className="relative w-[280px] h-[340px] mx-auto my-auto flex items-center justify-center">
                {/* 1. Back Top Right Tilted Card (Guy Model Photo) */}
                <div className="absolute right-2 top-0 w-[170px] h-[235px] rounded-[24px] overflow-hidden shadow-2xl border-4 border-white rotate-[13deg] z-10">
                    <img 
                        src={guyCardPhoto} 
                        alt="Match user"
                        className="w-full h-full object-cover" 
                    />
                    {/* Floating Heart Badge (Top Left of Guy Card) */}
                    <div className="absolute -top-3 left-3 w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100 z-30">
                        <Heart fill="#FF5E7E" color="#FF5E7E" size={20} />
                    </div>
                </div>

                {/* 2. Front Bottom Left Tilted Card (Static Girl Model Photo) */}
                <div className="absolute left-2 bottom-4 w-[170px] h-[235px] rounded-[24px] overflow-hidden shadow-2xl border-4 border-white -rotate-[13deg] z-20">
                    <img 
                        src={staticGirlPhoto} 
                        alt={storedName}
                        className="w-full h-full object-cover" 
                    />
                    {/* Floating Heart Badge (Bottom Left of Girl Card) */}
                    <div className="absolute -bottom-3 left-3 w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100 z-30">
                        <Heart fill="#FF5E7E" color="#FF5E7E" size={20} />
                    </div>
                </div>
            </div>

            {/* Content & Action Buttons */}
            <div className="w-full flex flex-col items-center shrink-0 mb-4 px-2">
                {/* Titles */}
                <h2 className="text-[21px] font-extrabold text-[#6E36E4] text-center mb-1.5 tracking-tight whitespace-nowrap">
                    It’s a match, {storedName.split(' ')[0]}!
                </h2>
                <p className="text-[14px] text-[#333333] font-medium text-center mb-7 leading-snug">
                    Start a conversation now with each other
                </p>

                {/* Say Hello Button */}
                <button
                    type="button"
                    onClick={handleSayHello}
                    className="w-full bg-[#6E36E4] text-white font-bold h-[54px] rounded-full text-[16px] shadow-md hover:bg-[#5e2cd6] active:scale-[0.98] transition-all cursor-pointer mb-3"
                >
                    Say hello
                </button>

                {/* Keep Swiping Button */}
                <button
                    type="button"
                    onClick={handleKeepSwiping}
                    className="w-full bg-[#F3EAFF] text-[#6E36E4] font-bold h-[52px] rounded-full text-[16px] hover:bg-[#EADBFF] active:scale-[0.98] transition-all cursor-pointer"
                >
                    Keep swiping
                </button>
            </div>
        </div>
    );
};

export default MatchSuccessPage;
