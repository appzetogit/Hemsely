import React from 'react';
import crossIcon from '../assets/icons/cross.png';
import tickIcon from '../assets/icons/tick.png';
import heightIcon from '../assets/icons/height.png';
import religionIcon from '../assets/icons/religion.png';
import drinkIcon from '../assets/icons/drink.png';
import smokeIcon from '../assets/icons/cigratee.png';
import studyIcon from '../assets/icons/study.png';
import heartIcon from '../assets/icons/heart.png';
import VerifiedBadge from './VerifiedBadge';
import { Pill, renderInterestIcon } from '../constants/discoveryData';

const DiscoveryProfileCard = ({
    profile,
    cardStyle,
    swipeHint,
    onStart,
    onMove,
    onEnd,
    isDragging,
    onReject,
    onLike,
    onFilterClick,
    hasActiveFilter
}) => (
    <>
        {/* Name & Info Header */}
        <div className="flex items-start justify-between mb-3 mt-1">
            <div className="flex flex-col pr-2">
                <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                    <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '26px', lineHeight: '32px', letterSpacing: '-0.01em', color: '#000' }}>
                        {profile.name}, {profile.age}
                    </h2>
                    {(profile.isPremium || profile.subscriptionName === 'Premium') && (
                        <VerifiedBadge size={22} />
                    )}
                    {profile.isNew && (
                        <span className="shrink-0 bg-[#FF7C67] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full ml-1">
                            New
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                    <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="black" stroke="none" className="shrink-0">
                        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                    </svg>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '11px', lineHeight: '14px', letterSpacing: '0.01em', color: '#000' }}>
                        {profile.job || 'Interior Designer at Company'}
                    </span>
                    {profile.distanceKm != null && (
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '11px', lineHeight: '14px', color: '#888' }}>
                            · {profile.distanceKm < 1 ? 'Under 1 km away' : `${profile.distanceKm} km away`}
                        </span>
                    )}
                </div>
            </div>

            {/* Filter Button (Scrolls naturally with profile header) */}
            {onFilterClick && (
                <button
                    type="button"
                    aria-label="Filter profiles"
                    onClick={onFilterClick}
                    className="w-9 h-9 flex items-center justify-center bg-transparent border-0 cursor-pointer text-[#6F3BCE] hover:opacity-80 active:scale-95 transition-all relative shrink-0 pt-1"
                >
                    <svg width="20" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M7 3V21M17 3V21" stroke="#6F3BCE" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="7" cy="8" r="3" fill="#6F3BCE" />
                        <circle cx="17" cy="16" r="3" fill="#6F3BCE" />
                    </svg>
                    {hasActiveFilter && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#6F3BCE] border border-white" />
                    )}
                </button>
            )}
        </div>

        {/* Swipeable Image Card */}
        <div
            role="region"
            aria-label="Profile card"
            className="w-full relative mb-6 cursor-grab active:cursor-grabbing"
            style={cardStyle}
            onTouchStart={e => onStart(e.touches[0].clientX)}
            onTouchMove={e => onMove(e.touches[0].clientX)}
            onTouchEnd={onEnd}
            onMouseDown={e => onStart(e.clientX)}
            onMouseMove={e => { if (isDragging.current) onMove(e.clientX); }}
            onMouseUp={onEnd}
            onMouseLeave={() => { if (isDragging.current) onEnd(); }}
        >
            <div className="w-full h-[490px] overflow-hidden select-none rounded-[24px] shadow-sm relative bg-gray-100">
                <img src={profile.photo} className="w-full h-full object-cover object-top pointer-events-none" alt="" draggable={false} />

                {swipeHint === 'like' && (
                    <div className="absolute top-6 left-6 z-30 px-4 py-2 rounded-xl border-[3px] border-green-500 bg-green-500/10 backdrop-blur-sm" style={{ transform: 'rotate(-15deg)' }}>
                        <span className="text-green-500 text-[24px] font-extrabold tracking-wide">LIKE</span>
                    </div>
                )}
                {swipeHint === 'nope' && (
                    <div className="absolute top-6 right-6 z-30 px-4 py-2 rounded-xl border-[3px] border-red-400 bg-red-400/10 backdrop-blur-sm" style={{ transform: 'rotate(15deg)' }}>
                        <span className="text-red-400 text-[24px] font-extrabold tracking-wide">NOPE</span>
                    </div>
                )}

                {profile.instagram && (
                    <div className="absolute top-[60%] left-0 bg-gradient-to-r from-[#D62976] to-[#FA7E1E] text-white text-[12px] font-bold px-3 py-1.5 rounded-r-full shadow-md z-10">
                        {profile.instagram}
                    </div>
                )}

                {/* Floating Action Buttons Inside Photo Card */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-20 pointer-events-none">
                    <button
                        type="button"
                        aria-label="Reject profile"
                        onClick={onReject}
                        className="pointer-events-auto w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-none cursor-pointer"
                        style={{ filter: 'drop-shadow(0px 6px 16px rgba(0, 0, 0, 0.18))' }}
                    >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9E32ED" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Like profile"
                        onClick={onLike}
                        className="pointer-events-auto w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-none cursor-pointer"
                        style={{ filter: 'drop-shadow(0px 6px 16px rgba(0, 0, 0, 0.18))' }}
                    >
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="#FF6464" stroke="none">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        {/* Details Section */}
        <div className="w-full mt-6 space-y-5">
            {profile.about && profile.about.trim() !== '' && (
                <section className="bg-white rounded-2xl p-4 border border-gray-100/90 shadow-xs">
                    <h3 className="text-[15px] font-bold text-gray-900 mb-2 tracking-tight">About me</h3>
                    <p className="text-[13.5px] text-gray-600 font-medium leading-relaxed">
                        {profile.about}
                    </p>
                </section>
            )}

            {profile.interests && profile.interests.length > 0 && (
                <section className="px-1">
                    <h3 className="text-[14.5px] font-bold text-gray-900 mb-2.5">My interests</h3>
                    <div className="flex flex-wrap gap-2">
                        {profile.interests.map(i => (
                            <Pill key={`interest-${i}`} icon={<span className="text-[#733FE0]">{renderInterestIcon(i)}</span>}>{i}</Pill>
                        ))}
                    </div>
                </section>
            )}

            {(() => {
                const isValValid = (val) => Boolean(val && val !== 'N/A' && val !== 'Not specified' && val !== 'undefined');
                const validHeight = isValValid(profile.basics?.height) ? profile.basics.height : null;
                const validReligion = isValValid(profile.basics?.religion) ? profile.basics.religion : null;
                const validDrinks = isValValid(profile.basics?.drinks) ? profile.basics.drinks : null;
                const validSmokes = isValValid(profile.basics?.smokes) ? profile.basics.smokes : null;
                const validEducation = isValValid(profile.basics?.education) ? profile.basics.education : null;

                const hasAnyBasic = validHeight || validReligion || validDrinks || validSmokes || validEducation;
                if (!hasAnyBasic) return null;

                return (
                    <section className="px-1">
                        <h3 className="text-[14.5px] font-bold text-gray-900 mb-2.5">Basics</h3>
                        <div className="flex flex-wrap gap-2">
                            {validHeight && <Pill icon={<img src={heightIcon} className="w-4 h-4 object-contain" alt="" />}>{validHeight}</Pill>}
                            {validReligion && <Pill icon={<img src={religionIcon} className="w-4 h-4 object-contain" alt="" />}>{validReligion}</Pill>}
                            {validDrinks && <Pill icon={<img src={drinkIcon} className="w-4 h-4 object-contain" alt="" />}>{validDrinks}</Pill>}
                            {validSmokes && <Pill icon={<img src={smokeIcon} className="w-4 h-4 object-contain" alt="" />}>{validSmokes}</Pill>}
                            {validEducation && <Pill icon={<img src={studyIcon} className="w-4 h-4 object-contain" alt="" />}>{validEducation}</Pill>}
                        </div>
                    </section>
                );
            })()}

            {(() => {
                const isValValid = (val) => Boolean(val && val !== 'N/A' && val !== 'Not specified' && val !== 'undefined');
                if (!isValValid(profile.lookingFor)) return null;
                return (
                    <section className="px-1">
                        <h3 className="text-[14.5px] font-bold text-gray-900 mb-2.5">I'm looking for</h3>
                        <Pill icon={<img src={heartIcon} className="w-4 h-4 object-contain" alt="" />}>{profile.lookingFor}</Pill>
                    </section>
                );
            })()}
        </div>

        {/* Additional User Photos & Prompts Cards */}
        {(() => {
            const extraPhotos = (profile.photos && profile.photos.length > 1)
                ? profile.photos.slice(1, 4)
                : [];
            const prompts = profile.prompts || [];
            const maxCount = Math.max(extraPhotos.length, prompts.length);

            if (maxCount === 0) return null;

            return (
                <div className="space-y-5 mt-6">
                    {Array.from({ length: maxCount }).map((_, i) => {
                        const photoUrl = extraPhotos[i];
                        const prompt = prompts[i];

                        return (
                            <React.Fragment key={`user-media-${i}`}>
                                {photoUrl && (
                                    <div className="rounded-[24px] overflow-hidden shadow-xs border border-gray-100 bg-white">
                                        <div className="w-full h-[480px] overflow-hidden bg-gray-100">
                                            <img src={photoUrl} alt="" className="w-full h-full object-cover object-top" />
                                        </div>
                                    </div>
                                )}
                                {prompt && (
                                    <div className="rounded-[20px] overflow-hidden shadow-xs border border-gray-100/80 bg-white p-4 flex justify-between items-center">
                                        <div className="flex-1">
                                            <p className="text-[12px] font-medium text-gray-900 leading-snug">{prompt.question || prompt.text}</p>
                                            <p className="text-[14.5px] font-normal text-black mt-1 leading-tight">{prompt.answer}</p>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            );
        })()}

    </>
);

export default DiscoveryProfileCard;
