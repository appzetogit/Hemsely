import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import demoPhoto from '../assets/6ee1ef9d2677e06049fb899a7658f4b9ac9c11dc.jpg';
import VerifiedBadge from '../components/VerifiedBadge';

// Reusing icons from assets or SVGs where needed
import crossIcon from '../assets/icons/cross.png';
import heightIcon from '../assets/icons/height.png';
import religionIcon from '../assets/icons/religion.png';
import drinkIcon from '../assets/icons/drink.png';
import smokeIcon from '../assets/icons/cigratee.png';
import studyIcon from '../assets/icons/study.png';

const Chip = ({ icon, iconSvg, label }) => (
    <div className="flex items-center px-3 py-1.5 rounded-full border border-[#6F3BCE42] bg-[#F9F7FF] shadow-sm">
        {iconSvg || (icon && <img src={icon} className="w-3.5 h-3.5 mr-2 object-contain" alt="" />)}
        <span className="text-[12px] font-medium text-black">{label}</span>
    </div>
);

const ProfileDetailPage = () => {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [liking, setLiking] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeLimitMessage, setLikeLimitMessage] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);

        if (!userId) {
            setError('No profile selected.');
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            const { data, ok } = await apiClient.get(`/users/${userId}`);
            if (!cancelled) {
                if (ok && data.success) {
                    setProfile(data.user);
                } else {
                    setError(data.message || 'Could not load this profile.');
                }
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const handleBack = () => navigate(-1);

    const handleLike = async () => {
        if (!userId || liking || liked) return;
        setLiking(true);
        try {
            const { data, ok, status } = await apiClient.post(`/matches/like/${userId}`, {});
            if (ok) {
                setLiked(true);
            } else if (status === 429 || (!ok && data?.message?.toLowerCase().includes('limit'))) {
                setLikeLimitMessage(data?.message || "You've reached your daily like limit. Upgrade to Premium for unlimited likes or try again tomorrow.");
            }
        } finally {
            setLiking(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-[#F0EBFB] border-t-[#6F3BCE] animate-spin" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-[15px] font-medium text-gray-500">{error || 'Profile not found.'}</p>
                <button type="button" onClick={handleBack} className="px-6 py-2.5 rounded-full bg-[#6F3BCE] text-white font-semibold text-sm">
                    Go back
                </button>
            </div>
        );
    }

    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User';
    const gallery = profile.galleryImages?.length ? profile.galleryImages.map((g) => (typeof g === 'string' ? g : g?.url)).filter(Boolean) : [];
    const mainPhoto = gallery[0] || profile.profilePicture || demoPhoto;

    return (
        <div className="min-h-screen bg-white font-sans pb-10 max-w-md mx-auto shadow-2xl border-x border-gray-100">
            {/* Top Bar with Back Button */}
            <header className="pt-2 pb-2 flex justify-between items-center px-4 sticky top-0 bg-white z-50">
                <button type="button" aria-label="Go back" onClick={handleBack} className="p-2 -ml-2 text-black">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
            </header>

            <div className="px-2">
                {/* Header Info */}
                <div className="flex flex-col mb-4 px-2">
                    <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                        <h2 className="text-[22px] font-bold text-black tracking-tight">{name}{profile.age ? `, ${profile.age}` : ''}</h2>
                        {(profile.isPremium || profile.subscriptionName === 'Premium') && (
                            <VerifiedBadge size={20} />
                        )}
                    </div>

                    {profile.profession && (
                        <div className="flex items-center text-black/80 text-[13px] font-medium space-x-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="black" stroke="none">
                                <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                            </svg>
                            <span>{profile.profession}</span>
                        </div>
                    )}
                </div>

                {/* Main Photo Section */}
                <div className="w-full relative rounded-[20px] overflow-hidden mb-5">
                    <img src={mainPhoto} alt="" className="w-full h-[380px] object-cover" />

                    {/* Action Buttons Overlay */}
                    <div className="absolute bottom-5 inset-x-0 px-8 flex justify-between items-center z-20">
                        <button type="button" aria-label="Go back" className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform" onClick={handleBack}>
                            <img src={crossIcon} alt="" className="w-8 h-8 object-contain" />
                        </button>
                        <button
                            type="button"
                            aria-label="Like profile"
                            disabled={liking || liked}
                            className="w-16 h-16 bg-[#F9F7FF] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-60"
                            onClick={handleLike}
                        >
                            <svg width="34" height="34" viewBox="0 0 24 24" fill={liked ? '#6F3BCE' : '#FE7C69'} stroke="none">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Details Section */}
                <div className="px-2 space-y-4">
                    {profile.bio && (
                        <section>
                            <h3 className="text-[16px] font-bold text-black mb-1.5">About me</h3>
                            <p className="text-[#333333] text-[13px] leading-relaxed font-sans">{profile.bio}</p>
                        </section>
                    )}

                    {(() => {
                        const isValValid = (val) => {
                            if (!val) return false;
                            const str = String(val).trim().toLowerCase();
                            return str !== '' && str !== 'n/a' && str !== 'not specified' && str !== 'not_specified' && str !== 'undefined' && str !== 'null' && str !== 'none';
                        };
                        if (!isValValid(profile.relationshipGoal)) return null;
                        return (
                            <section>
                                <h3 className="text-[16px] font-bold text-black mb-2">Looking for</h3>
                                <div className="inline-flex items-center px-3 text-[13px] py-2 rounded-full bg-[#F9F7FF] border border-[#6F3BCE42] shadow-sm">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF4458" className="mr-2.5">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                    <span className="text-black font-medium text-[14px]">{profile.relationshipGoal}</span>
                                </div>
                            </section>
                        );
                    })()}

                    {(() => {
                        const isValValid = (val) => {
                            if (!val) return false;
                            const str = String(val).trim().toLowerCase();
                            return str !== '' && str !== 'n/a' && str !== 'not specified' && str !== 'not_specified' && str !== 'undefined' && str !== 'null' && str !== 'none';
                        };
                        const heightStr = profile.height?.value ? `${profile.height.value} ${profile.height.unit || ''}`.trim() : null;
                        const validHeight = isValValid(heightStr) ? heightStr : null;
                        const validReligion = isValValid(profile.religion) ? profile.religion : null;
                        const validDrinks = isValValid(profile.drinkingStatus) ? profile.drinkingStatus : null;
                        const validSmokes = isValValid(profile.smokingStatus) ? profile.smokingStatus : null;
                        const validEducation = isValValid(profile.education) ? profile.education : null;
                        const langStr = Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages;
                        const validLanguages = isValValid(langStr) ? langStr : null;

                        const hasAnyBasic = validHeight || validReligion || validDrinks || validSmokes || validEducation || validLanguages;
                        if (!hasAnyBasic) return null;

                        return (
                            <section>
                                <h3 className="text-[16px] font-bold text-black mb-2">Basics</h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {validHeight && <Chip icon={heightIcon} label={validHeight} />}
                                    {validReligion && <Chip icon={religionIcon} label={validReligion} />}
                                    {validDrinks && <Chip icon={drinkIcon} label={validDrinks} />}
                                    {validSmokes && <Chip icon={smokeIcon} label={validSmokes} />}
                                    {validEducation && <Chip icon={studyIcon} label={validEducation} />}
                                    {validLanguages && (
                                        <Chip iconSvg={
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6F3BCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="2" y1="12" x2="22" y2="12" />
                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                            </svg>
                                        } label={validLanguages} />
                                    )}
                                </div>
                            </section>
                        );
                    })()}

                    {profile.interests?.length > 0 && (
                        <section>
                            <h3 className="text-[16px] font-bold text-black mb-2">Interests</h3>
                            <div className="flex flex-wrap gap-2.5">
                                {profile.interests.map((interest) => (
                                    <Chip key={interest} label={interest} />
                                ))}
                            </div>
                        </section>
                    )}

                    {gallery.length > 0 && (
                        <section className="space-y-4 mt-3">
                            <h3 className="text-[16px] font-bold text-black">Photos</h3>
                            {gallery.map((url) => (
                                <div key={url} className="w-full rounded-[20px] overflow-hidden">
                                    <img src={url} alt="" className="w-full h-[320px] object-cover" />
                                </div>
                            ))}
                        </section>
                    )}
                </div>
            </div>

            {/* Daily Like Limit Exceeded Modal */}
            {likeLimitMessage && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
                    }}
                >
                    <div
                        className="animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            background: '#FFFFFF', borderRadius: '24px',
                            padding: '32px 24px', maxWidth: '360px', width: '100%',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: '#F0EBFB', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', marginBottom: '20px',
                            }}
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6F3BCE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>

                        <h3 style={{
                            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '20px',
                            lineHeight: '26px', color: '#111827', marginBottom: '8px',
                        }}>Daily Like Limit Reached</h3>

                        <p style={{
                            fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '14px',
                            lineHeight: '145%', color: '#6B7280', marginBottom: '24px',
                        }}>{likeLimitMessage}</p>

                        <button
                            type="button"
                            onClick={() => { setLikeLimitMessage(''); navigate('/premium'); }}
                            className="active:scale-[0.97] transition-transform"
                            style={{
                                width: '100%', height: '50px', background: 'linear-gradient(135deg, #7C3AED 0%, #6F3BCE 100%)',
                                borderRadius: '80px', border: 'none', cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '15px',
                                color: '#FFFFFF', boxShadow: '0 4px 14px rgba(111, 59, 206, 0.4)',
                            }}
                        >
                            Upgrade to Premium
                        </button>

                        <button
                            type="button"
                            onClick={() => setLikeLimitMessage('')}
                            style={{
                                marginTop: '14px', background: 'none', border: 'none',
                                fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '14px',
                                color: '#6B7280', cursor: 'pointer',
                            }}
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileDetailPage;
