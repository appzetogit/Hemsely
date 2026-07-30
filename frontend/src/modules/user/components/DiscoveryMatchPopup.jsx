import React from 'react';

const HeartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF5A60" stroke="none">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const DiscoveryMatchPopup = ({ profile, myPhoto, onClose, onSayHello }) => {
    const firstName = (profile?.name || 'User').split(' ')[0];

    return (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-white max-w-[414px] mx-auto overflow-hidden p-6 animate-in fade-in duration-300">
            {/* Top Label */}
            <div className="w-full text-left pt-2">
                <span className="text-[14px] font-medium text-gray-400 opacity-80 tracking-tight">
                    it'a match
                </span>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full my-auto">
                {/* Overlapping Cards Container */}
                <div className="relative w-[280px] h-[300px] flex items-center justify-center my-4">
                    {/* Back Card (Current User / My Photo) */}
                    <div className="absolute top-2 right-4 w-[145px] h-[210px] rounded-[24px] overflow-hidden shadow-2xl rotate-[14deg] border-2 border-white bg-gray-100">
                        <img src={myPhoto} alt="My profile" className="w-full h-full object-cover" />
                        {/* Top Heart Badge */}
                        <div className="absolute -top-1.5 left-2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center z-20 border border-gray-100">
                            <HeartIcon />
                        </div>
                    </div>

                    {/* Front Card (Matched User Photo) */}
                    <div className="absolute bottom-4 left-3 w-[145px] h-[210px] rounded-[24px] overflow-hidden shadow-2xl -rotate-[12deg] border-2 border-white bg-gray-100 z-10">
                        <img src={profile?.photo} alt={firstName} className="w-full h-full object-cover" />
                        {/* Bottom Heart Badge */}
                        <div className="absolute -bottom-1.5 left-2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center z-20 border border-gray-100">
                            <HeartIcon />
                        </div>
                    </div>
                </div>

                {/* Match Typography */}
                <h1 className="text-[26px] font-black text-[#733FE0] text-center mt-6 tracking-tight leading-tight">
                    It’s a match, {firstName}!
                </h1>
                <p className="text-[13.5px] font-medium text-gray-500 text-center mt-2 max-w-[260px] leading-snug">
                    Start a conversation now with each other
                </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3 pb-4 shrink-0">
                <button
                    type="button"
                    onClick={onSayHello || onClose}
                    className="w-full h-[52px] rounded-full bg-[#733FE0] hover:bg-[#6232c7] active:scale-[0.98] text-white font-extrabold text-[16px] shadow-lg shadow-purple-200/60 transition-all cursor-pointer border-0 flex items-center justify-center"
                >
                    Say hello
                </button>

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-[52px] rounded-full bg-[#F5F0FE] hover:bg-[#EFE5FD] active:scale-[0.98] text-[#733FE0] font-extrabold text-[16px] transition-all cursor-pointer border-0 flex items-center justify-center"
                >
                    Keep swiping
                </button>
            </div>
        </div>
    );
};

export default DiscoveryMatchPopup;
