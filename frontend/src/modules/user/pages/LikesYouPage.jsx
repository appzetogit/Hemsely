import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import DiscoveryFilterPopup from '../components/DiscoveryFilterPopup';
import apiClient from '../../../shared/services/apiClient';
import { getStored } from '../constants/discoveryData';

import demoPhoto from '../assets/6ee1ef9d2677e06049fb899a7658f4b9ac9c11dc.jpg';
import demoPhoto2 from '../assets/853e31e910922fe7f47f66de5c5206f78a610037.jpg';
import demoPhoto3 from '../assets/2d480a64955b32a3f343496aa510b7c06b62c97c.png';
import demoPhoto4 from '../assets/9bd108315ddebf58571ec9fe25c0a6d5d63096ba.png';

const MOCK_BLURRED_LIKES = [
    { id: 'm1', name: 'Aanya', age: 23, photo: demoPhoto },
    { id: 'm2', name: 'Riya', age: 22, photo: demoPhoto2 },
    { id: 'm3', name: 'Sneha', age: 24, photo: demoPhoto3 },
    { id: 'm4', name: 'Priya', age: 25, photo: demoPhoto4 },
    { id: 'm5', name: 'Kavya', age: 23, photo: demoPhoto },
    { id: 'm6', name: 'Ananya', age: 22, photo: demoPhoto2 },
];

const LikeCard = ({ person, onClick, isBlurred }) => (
    <button
        type="button"
        onClick={onClick}
        className={`text-left cursor-pointer transition-all ${isBlurred ? 'pointer-events-none select-none' : ''}`}
        style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '0.86',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: 'inset 0px -60px 20px -10px rgba(0, 0, 0, 0.4)',
        }}
    >
        <img
            src={person.photo}
            alt=""
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: isBlurred ? 'blur(14px)' : 'none',
                transform: isBlurred ? 'scale(1.1)' : 'none',
            }}
        />

        <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            filter: isBlurred ? 'blur(6px)' : 'none',
        }}>
            <span style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '18px',
                lineHeight: '22px', color: '#FFFFFF',
            }}>{person.name}, {person.age}</span>
            <span style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '14px',
                lineHeight: '18px', color: '#FFFFFF', opacity: 0.9
            }}>Liked you</span>
        </div>

        <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            filter: isBlurred ? 'blur(4px)' : 'none',
        }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        </div>
    </button>
);

const LikesYouPage = () => {
    const navigate = useNavigate();
    const [showFilter, setShowFilter] = useState(false);
    const [likesAreQueued, setLikesAreQueued] = useState(false);
    const [likesData, setLikesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState(null);

    const [isPremium, setIsPremium] = useState(() => {
        try {
            localStorage.removeItem('isPremium:v1');
            localStorage.removeItem('isPremium');
        } catch {}

        try {
            const storedUser = JSON.parse(
                localStorage.getItem('user') ||
                sessionStorage.getItem('user') ||
                localStorage.getItem('Hemsely_user:v1') ||
                '{}'
            );
            return !!(storedUser.isPremium || storedUser.isSuperSubscriber || storedUser.isSuperUser);
        } catch {
            return false;
        }
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const storedUser = JSON.parse(
                    localStorage.getItem('user') ||
                    sessionStorage.getItem('user') ||
                    '{}'
                );
                const myId = storedUser._id || storedUser.id || localStorage.getItem('userId');
                if (myId) {
                    const { data: userRes, ok: userOk } = await apiClient.get(`/users/${myId}`);
                    if (!cancelled && userOk && userRes?.user) {
                        const u = userRes.user;
                        const activePrem = !!(u.isPremium || u.isSuperSubscriber || u.isSuperUser);
                        setIsPremium(activePrem);
                        localStorage.setItem('user', JSON.stringify(u));
                        sessionStorage.setItem('user', JSON.stringify(u));
                    }
                }
            } catch {}

            try {
                const { data, ok } = await apiClient.get('/matches/likes/received');
                if (!cancelled && ok && data.success) {
                    setLikesAreQueued(!!data.queued);
                    setLikesData(
                        data.likes
                            .filter((like) => like.likedBy)
                            .map((like) => ({
                                id: like.likedBy._id,
                                name: like.likedBy.firstName || 'User',
                                age: like.likedBy.age || '',
                                photo: like.likedBy.profilePicture || demoPhoto,
                            }))
                    );
                }
            } catch {}
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const cardsToShow = (likesData.length > 0 ? likesData : MOCK_BLURRED_LIKES).filter((person) => {
        if (!filters || !person.age) return true;
        return person.age >= filters.minAge && person.age <= filters.maxAge;
    });

    return (
        <div className="h-[100dvh] flex flex-col max-w-[414px] mx-auto overflow-hidden relative" style={{ background: isPremium ? '#FCFCFC' : '#121212' }}>

            {/* Header - Only rendered when Premium */}
            {isPremium && (
                <header
                    className="relative flex items-center justify-between px-4 shrink-0 bg-[#FCFCFC] shadow-xs"
                    style={{ height: '52px', borderRadius: '0px 0px 14px 14px', zIndex: 30 }}
                >
                    <button
                        type="button"
                        aria-label="Go back"
                        onClick={() => navigate(-1)}
                        className="w-[40px] h-[40px] flex items-center justify-start bg-transparent border-0 cursor-pointer text-gray-800"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15,18 9,12 15,6" />
                        </svg>
                    </button>
                    
                    <h1 className="font-bold text-[17px] text-black tracking-tight text-center flex-1">
                        Likes
                    </h1>

                    {/* Filter Icon at Right */}
                    <button
                        type="button"
                        aria-label="Filter likes"
                        onClick={() => setShowFilter(true)}
                        className="w-[40px] h-[40px] flex items-center justify-end bg-transparent border-0 cursor-pointer text-[#733FE0]"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14" />
                            <line x1="4" y1="10" x2="4" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12" y2="3" />
                            <line x1="20" y1="21" x2="20" y2="16" />
                            <line x1="20" y1="12" x2="20" y2="3" />
                            <line x1="1" y1="14" x2="7" y2="14" />
                            <line x1="9" y1="8" x2="15" y2="8" />
                            <line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                    </button>
                </header>
            )}

            {/* Content Area */}
            <main
                className="flex-1 overflow-y-auto relative"
                style={{ padding: isPremium ? '20px 20px 100px' : '16px 16px 100px' }}
            >
                {!isPremium ? (
                    <>
                        {/* Full Screen Blurred Cards Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            filter: 'blur(10px)',
                            opacity: 0.7,
                            pointerEvents: 'none',
                            userSelect: 'none',
                        }}>
                            {cardsToShow.map((person) => (
                                <LikeCard key={person.id} person={person} isBlurred={true} />
                            ))}
                        </div>

                        {/* Centered Lock & Upgrade Overlay matching Screenshot 2 */}
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-black/65 backdrop-blur-[3px]">
                            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/25 flex items-center justify-center mb-5 shadow-lg backdrop-blur-md">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                            </div>

                            <h2 className="text-white font-extrabold text-[24px] leading-[1.25] mb-6 max-w-[250px] tracking-tight">
                                Upgrade to see who likes you
                            </h2>

                            <button
                                type="button"
                                onClick={() => navigate('/premium')}
                                className="px-8 py-3 rounded-full bg-[#733FE0] hover:bg-[#6232c7] active:scale-95 text-white font-extrabold text-[15px] shadow-xl shadow-purple-950/60 transition-all border-0 cursor-pointer tracking-wide"
                            >
                                Unlock Likes
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ marginBottom: '22px' }}>
                            <h2 style={{
                                fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '18px',
                                lineHeight: '22px', color: '#000', opacity: 0.8
                            }}>
                                {likesAreQueued ? 'Your likes are in queue' : `${likesData.length} ${likesData.length === 1 ? 'person likes' : 'people like'} you`}
                            </h2>
                        </div>

                        {likesAreQueued ? (
                            <div style={{
                                background: 'linear-gradient(180deg, #FFF1F7 0%, #FFFFFF 100%)',
                                border: '1px solid #F6D6E5',
                                borderRadius: '28px',
                                padding: '28px 22px',
                                boxShadow: '0 14px 28px rgba(255, 77, 148, 0.08)',
                            }}>
                                <div style={{
                                    width: '58px',
                                    height: '58px',
                                    borderRadius: '18px',
                                    background: 'linear-gradient(135deg, #FF4B91 0%, #9B27FF 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '18px',
                                    color: '#FFFFFF',
                                    fontSize: '26px',
                                    fontWeight: 700,
                                }}>
                                    Q
                                </div>
                                <h3 style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 700,
                                    fontSize: '20px',
                                    lineHeight: '26px',
                                    color: '#1f1633',
                                    marginBottom: '10px',
                                }}>
                                    Likes visibility is paused
                                </h3>
                                <p style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 400,
                                    fontSize: '14px',
                                    lineHeight: '22px',
                                    color: '#7f5a73',
                                    marginBottom: '16px',
                                }}>
                                    The admin has kept new users in queue mode. You can keep using the app, but who liked you will stay hidden until the queue is turned off.
                                </p>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderRadius: '999px',
                                    background: '#FFE5F1',
                                    color: '#D81B60',
                                    padding: '10px 14px',
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 600,
                                    fontSize: '13px',
                                }}>
                                    Queue mode is active
                                </div>
                            </div>
                        ) : loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 rounded-full border-4 border-[#F0EBFB] border-t-[#6F3BCE] animate-spin" />
                            </div>
                        ) : likesData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-20 gap-2">
                                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '15px', color: '#888' }}>
                                    No one has liked you yet. Keep swiping!
                                </p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '12px',
                            }}>
                                {likesData.map(person => (
                                    <LikeCard key={person.id} person={person} onClick={() => navigate(`/profile-detail/${person.id}`)} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 100 }}>
                <div style={{ width: '100%', maxWidth: '414px', pointerEvents: 'auto' }}>
                    <BottomNavigation activeTab="likes" />
                </div>
            </div>

            {/* Shared Filter Popup */}
            {showFilter && (
                <DiscoveryFilterPopup
                    appliedFilters={filters}
                    onApply={(newFilters) => { setFilters(newFilters); setShowFilter(false); }}
                    onClose={() => setShowFilter(false)}
                    onUnlockPremium={() => { setShowFilter(false); navigate('/premium'); }}
                    isPremium={isPremium}
                />
            )}
        </div>
    );
};

export default LikesYouPage;
