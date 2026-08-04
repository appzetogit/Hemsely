import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DiscoveryFilterPopup from '../components/DiscoveryFilterPopup';
import DiscoveryMatchPopup from '../components/DiscoveryMatchPopup';
import DiscoveryProfileCard from '../components/DiscoveryProfileCard';
import AwsSelfieVerificationModal from '../components/AwsSelfieVerificationModal';
import BottomNavigation from '../components/BottomNavigation';

import { getStored, setStored } from '../constants/discoveryData';
import apiClient from '../../../shared/services/apiClient';
import demoPhoto from '../assets/6ee1ef9d2677e06049fb899a7658f4b9ac9c11dc.jpg';

const toProfileCardShape = (user) => {
    const allPhotos = [];
    if (user.profilePicture) allPhotos.push(user.profilePicture);
    if (Array.isArray(user.galleryImages)) {
        user.galleryImages.forEach((g) => {
            const url = typeof g === 'string' ? g : g?.url;
            if (url && !allPhotos.includes(url)) {
                allPhotos.push(url);
            }
        });
    }
    if (allPhotos.length === 0) allPhotos.push(demoPhoto);

    return {
        id: user._id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
        age: user.age || '',
        verified: !!user.isVerified,
        isNew: false,
        job: user.profession || '',
        photo: allPhotos[0],
        photos: allPhotos,
        instagram: null,
        about: user.bio || '',
        lookingFor: user.relationshipGoal || 'Not specified',
        basics: {
            height: user.height?.value ? `${user.height.value} ${user.height.unit || ''}`.trim() : 'N/A',
            religion: user.religion || 'N/A',
            drinks: user.drinkingStatus || 'N/A',
            smokes: user.smokingStatus || 'N/A',
            education: user.education || 'N/A',
        },
        interests: user.interests?.length ? user.interests : [],
        prompts: Array.isArray(user.prompts) ? user.prompts.filter((p) => p && (p.question || p.text) && p.answer) : [],
        distanceKm: typeof user.distanceKm === 'number' ? user.distanceKm : null,
    };
};

const DEFAULT_FILTERS = { distanceKm: 100 };

// Builds the /users/discovery querystring; distanceKm is only appended when
// it diverges from the no-op default, matching the ChatListPage filter convention.
const buildDiscoveryQuery = (pageToLoad, filters) => {
    const params = new URLSearchParams({ page: pageToLoad, limit: 20 });
    if (filters.distanceKm !== DEFAULT_FILTERS.distanceKm) {
        params.set('distanceKm', filters.distanceKm);
    }
    return params.toString();
};

const getMyPhoto = () => {
    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return storedUser.profilePicture || demoPhoto;
    } catch {
        return demoPhoto;
    }
};

/* ─── Main Discovery Page ─── */
const DiscoveryPage = () => {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [likesCount, setLikesCount] = useState(0);
    const [passesCount, setPassesCount] = useState(0);
    const [matchesCount, setMatchesCount] = useState(0);
    const [showMatch, setShowMatch] = useState(null);
    const [showIncomplete, setShowIncomplete] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [queueInfo, setQueueInfo] = useState(null);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [showSelfieModal, setShowSelfieModal] = useState(false);
    const [isUserVerified, setIsUserVerified] = useState(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            return Boolean(u.isVerified || u.selfieStatus === 'approved');
        } catch {
            return false;
        }
    });
    const [selfieStatus, setSelfieStatus] = useState(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            return u.selfieStatus || (u.isVerified ? 'approved' : 'not_submitted');
        } catch {
            return 'not_submitted';
        }
    });
    const [rejectionReason, setRejectionReason] = useState('');
    const [checkingStatus, setCheckingStatus] = useState(false);

    const hasActiveFilter = filters.distanceKm !== DEFAULT_FILTERS.distanceKm;
    const isProfileComplete = getStored('profile_complete', false);

    const refreshUserVerificationStatus = async () => {
        setCheckingStatus(true);
        try {
            const { ok, data } = await apiClient.get('/users/me');
            if (ok && data?.user) {
                const verified = Boolean(data.user.isVerified || data.user.selfieStatus === 'approved');
                setIsUserVerified(verified);
                setSelfieStatus(data.user.selfieStatus || (verified ? 'approved' : 'not_submitted'));
                setRejectionReason(data.user.selfieRejectionReason || '');
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...storedUser, ...data.user }));
            }
        } catch { }
        setCheckingStatus(false);
    };

    // Fetch current user details to check verification status
    useEffect(() => {
        refreshUserVerificationStatus();
    }, []);

    // Auto-sync real GPS device location to backend for real-time dynamic distance calculation

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                if (latitude && longitude) {
                    apiClient.put('/users/me', {
                        location: {
                            coordinates: {
                                type: 'Point',
                                coordinates: [longitude, latitude],
                            },
                        },
                    }).catch(() => { });
                }
            }, () => { }, { timeout: 10000, enableHighAccuracy: true });
        }
    }, []);

    const [swipedIds, setSwipedIds] = useState(new Set());
    const [dragOffset, setDragOffset] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [exitDir, setExitDir] = useState(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const curX = useRef(0);

    const loadFeed = useCallback(async (pageToLoad) => {
        const { data, ok } = await apiClient.get(`/users/discovery?${buildDiscoveryQuery(pageToLoad, filters)}`);
        if (ok && data.success) {
            setProfiles((prev) => {
                const existingIds = new Set(prev.map((p) => String(p.id)));
                const newItems = data.users
                    .filter((u) => !existingIds.has(String(u._id)) && !swipedIds.has(String(u._id)))
                    .map(toProfileCardShape);
                return [...prev, ...newItems];
            });
            setHasMore(!!data.hasMore);
        } else if (data?.queued) {
            setQueueInfo({ position: data.position, totalQueued: data.totalQueued });
            setHasMore(false);
        } else {
            setHasMore(false);
        }
    }, [filters, swipedIds]);

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setCurrentIndex(0);
        setProfiles([]);
        setPage(1);
        setHasMore(true);
    };

    useEffect(() => {
        setLoading(true);
        loadFeed(1).finally(() => setLoading(false));
    }, [loadFeed]);

    // Prefetch the next page once the user is close to the end of the loaded stack
    useEffect(() => {
        if (!hasMore || loading || profiles.length === 0) return;
        if (currentIndex >= profiles.length - 3) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadFeed(nextPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, profiles.length, hasMore, loading]);

    const profile = profiles[currentIndex];
    const isFinished = !loading && currentIndex >= profiles.length && !hasMore;

    const goNext = () => {
        setDragOffset(0);
        setIsExiting(false);
        setExitDir(null);
        setCurrentIndex((prev) => prev + 1);
    };

    const handleLike = async () => {
        if (!profile) return;
        if (!isProfileComplete) { setShowIncomplete(true); return; }

        setSwipedIds((prev) => new Set(prev).add(profile.id));
        setLikesCount((c) => c + 1);
        setIsExiting(true);
        setExitDir('right');

        try {
            const { data, ok } = await apiClient.post(`/matches/like/${profile.id}`, {});
            if (ok && data.isMatched) {
                setMatchesCount((c) => c + 1);
                setShowMatch(profile);
            } else if (!ok && data?.queued) {
                setQueueInfo({ position: data.position, totalQueued: data.totalQueued });
            }
        } catch {
            // Network hiccup — the swipe still advances locally; the like can be retried from the profile later.
        }

        setTimeout(goNext, 350);
    };

    const handleReject = () => {
        if (!profile) return;
        if (!isProfileComplete) { setShowIncomplete(true); return; }
        setSwipedIds((prev) => new Set(prev).add(profile.id));
        setPassesCount((c) => c + 1);

        setIsExiting(true);
        setExitDir('left');
        setTimeout(goNext, 350);
    };

    const handleReset = () => {
        setCurrentIndex(0);
        setProfiles([]);
        setPage(1);
        setHasMore(true);
        setLikesCount(0);
        setPassesCount(0);
        setMatchesCount(0);
        setLoading(true);
        loadFeed(1).finally(() => setLoading(false));
    };

    const onStart = (x) => { if (isExiting) return; isDragging.current = true; startX.current = x; curX.current = x; };
    const onMove = (x) => { if (!isDragging.current || isExiting) return; curX.current = x; setDragOffset(curX.current - startX.current); };
    const onEnd = () => {
        if (!isDragging.current || isExiting) return;
        isDragging.current = false;
        const diff = curX.current - startX.current;
        if (!isProfileComplete && (diff > 60 || diff < -60)) {
            setDragOffset(0);
            setShowIncomplete(true);
            return;
        }
        if (diff > 100) handleLike();
        else if (diff < -100) handleReject();
        else setDragOffset(0);
    };

    const handleSayHello = async (matchedProfile) => {
        const target = matchedProfile || showMatch;
        setShowMatch(null);
        if (!target?.id) return;

        try {
            await apiClient.post(`/messages/send/${target.id}`, { message: 'Hello 👋' });
        } catch {
            // Silence network error and navigate to chat screen anyway
        }

        navigate(`/chat/${target.id}`, {
            state: { name: target.name, photo: target.photo }
        });
    };

    const cardStyle = isExiting
        ? { transform: `translateX(${exitDir === 'right' ? '120%' : '-120%'}) rotate(${exitDir === 'right' ? '12deg' : '-12deg'})`, opacity: 0, transition: 'transform 0.35s ease, opacity 0.35s ease' }
        : { transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`, transition: isDragging.current ? 'none' : 'transform 0.3s ease' };

    const swipeHint = dragOffset > 60 ? 'like' : dragOffset < -60 ? 'nope' : null;

    return (
        <div className="h-[100dvh] flex flex-col font-sans overflow-hidden max-w-[414px] mx-auto relative" style={{ background: '#FCFCFC' }}>

            <main className="flex-1 overflow-y-auto pt-3 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-[15.53px]">
                {!isUserVerified ? (
                    selfieStatus === 'pending' ? (
                        <div className="flex flex-col items-center justify-center min-h-[440px] h-full text-center gap-5 pt-10 px-4">
                            <div className="w-24 h-24 rounded-full bg-amber-50 border-2 border-amber-500/30 flex items-center justify-center shadow-lg animate-pulse">
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                    Profile Under Review
                                </span>
                                <h3 className="text-[22px] font-extrabold text-black tracking-tight mb-2">Profile Under Review</h3>
                                <p className="text-[14px] text-gray-500 max-w-[300px] leading-relaxed font-normal">
                                    Your live selfie photo is currently under review by our admin team. Please wait for approval.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={checkingStatus}
                                onClick={refreshUserVerificationStatus}
                                className="w-full max-w-[280px] h-[52px] bg-amber-600 text-white font-bold rounded-full text-[15px] shadow-lg hover:bg-amber-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {checkingStatus ? 'Checking Status...' : 'Check Verification Status'}
                            </button>
                        </div>
                    ) : selfieStatus === 'rejected' ? (
                        <div className="flex flex-col items-center justify-center min-h-[440px] h-full text-center gap-5 pt-10 px-4">
                            <div className="w-24 h-24 rounded-full bg-red-50 border-2 border-red-500/30 flex items-center justify-center shadow-lg">
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            </div>
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider mb-3">
                                    Verification Rejected
                                </span>
                                <h3 className="text-[22px] font-extrabold text-black tracking-tight mb-2">Selfie Verification Failed</h3>
                                <p className="text-[14px] text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100 max-w-[300px] leading-relaxed font-medium mb-1">
                                    {rejectionReason || 'Your selfie photo could not be verified automatically.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSelfieModal(true)}
                                className="w-full max-w-[280px] h-[52px] bg-[#6E36E4] text-white font-bold rounded-full text-[16px] shadow-lg hover:bg-[#5e2cc5] active:scale-95 transition-all cursor-pointer"
                            >
                                Re-take Selfie Now
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[440px] h-full text-center gap-5 pt-10 px-4">
                            <div className="w-24 h-24 rounded-full bg-purple-50 border-2 border-[#6E36E4]/20 flex items-center justify-center shadow-lg animate-pulse">
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6E36E4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-[22px] font-extrabold text-black tracking-tight mb-2">Selfie Verification Required</h3>
                                <p className="text-[14px] text-gray-500 max-w-[290px] leading-relaxed font-normal">
                                    For Activate Account selfie verification is Needed
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSelfieModal(true)}
                                className="w-full max-w-[280px] h-[52px] bg-[#6E36E4] text-white font-bold rounded-full text-[16px] shadow-lg hover:bg-[#5e2cc5] active:scale-95 transition-all cursor-pointer"
                            >
                                Verify Selfie Now
                            </button>
                        </div>
                    )
                ) : queueInfo ? (

                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 pt-10 px-2">
                        <div className="w-20 h-20 rounded-full bg-[#F7EBFE] flex items-center justify-center">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6F3BCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '22px', color: '#000' }}>You're in the queue</h2>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '14px', color: '#888', maxWidth: '280px' }}>
                            We're managing new members to keep the community balanced. You're number{' '}
                            <b style={{ color: '#6F3BCE' }}>{queueInfo.position}</b> of <b>{queueInfo.totalQueued}</b> in line.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/premium')}
                            className="mt-2 active:scale-95 transition-transform"
                            style={{ padding: '14px 36px', background: '#6F3BCE', color: '#fff', borderRadius: '80px', border: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '16px', boxShadow: '0 4px 16px rgba(111,59,206,0.3)', cursor: 'pointer' }}
                        >
                            Get instant access
                        </button>
                        <button
                            type="button"
                            onClick={() => { setQueueInfo(null); setLoading(true); loadFeed(1).finally(() => setLoading(false)); }}
                            style={{ background: 'none', border: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '14px', color: '#888', cursor: 'pointer' }}
                        >
                            Check again
                        </button>
                    </div>
                ) : loading && profiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 pt-20">
                        <div className="w-10 h-10 rounded-full border-4 border-[#F0EBFB] border-t-[#6F3BCE] animate-spin" />
                        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '14px', color: '#888' }}>Finding people near you...</p>
                    </div>
                ) : isFinished ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 pt-20">
                        <div className="w-20 h-20 rounded-full bg-[#F7EBFE] flex items-center justify-center">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="#6F3BCE" stroke="none">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>
                        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '22px', color: '#000' }}>No Profile yet</h2>
                        <button type="button" onClick={handleReset} className="mt-4 active:scale-95 transition-colors" style={{ padding: '12px 32px', background: '#6F3BCE', color: '#fff', borderRadius: '80px', border: 'none', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '16px', boxShadow: '0 4px 16px rgba(111,59,206,0.3)', cursor: 'pointer' }}>
                            Check again
                        </button>
                    </div>
                ) : profile ? (
                    <DiscoveryProfileCard
                        profile={profile}
                        cardStyle={cardStyle}
                        swipeHint={swipeHint}
                        onStart={onStart}
                        onMove={onMove}
                        onEnd={onEnd}
                        isDragging={isDragging}
                        onReject={handleReject}
                        onLike={handleLike}
                        onFilterClick={() => setShowFilter(true)}
                        hasActiveFilter={hasActiveFilter}
                    />
                ) : null}
            </main>

            <BottomNavigation activeTab="people" />

            {/* Match Popup */}
            {showMatch && (
                <DiscoveryMatchPopup
                    profile={showMatch}
                    myPhoto={getMyPhoto()}
                    onClose={() => setShowMatch(null)}
                    onSayHello={() => handleSayHello(showMatch)}
                />
            )}

            {/* Filter Popup */}
            {showFilter && (
                <DiscoveryFilterPopup
                    appliedFilters={filters}
                    onApply={handleApplyFilters}
                    onClose={() => setShowFilter(false)}
                    onUnlockPremium={() => { setShowFilter(false); navigate('/premium'); }}
                />
            )}

            {/* Incomplete Profile Overlay */}
            {showIncomplete && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Close incomplete profile notice backdrop"
                        className="fixed inset-0 bg-black/56 backdrop-blur-[25px] border-0 cursor-default"
                        onClick={() => setShowIncomplete(false)}
                    />
                    <div
                        className="relative z-10 flex flex-col items-center"
                        style={{
                            width: '340px', maxWidth: '90vw', background: '#FFFFFF',
                            borderRadius: '24px', padding: '32px 24px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        }}
                    >
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(111, 59, 206, 0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6F3BCE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>

                        <h3 style={{
                            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '20px',
                            lineHeight: '24px', color: '#000', textAlign: 'center', marginBottom: '8px',
                        }}>Complete Your Profile</h3>

                        <p style={{
                            fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '14px',
                            lineHeight: '140%', color: '#000', opacity: 0.6, textAlign: 'center',
                            marginBottom: '24px',
                        }}>Please complete your profile details before you can like or pass on profiles.</p>

                        <button
                            type="button"
                            onClick={() => { setShowIncomplete(false); navigate('/edit-profile'); }}
                            className="active:scale-[0.97] transition-transform"
                            style={{
                                width: '100%', height: '52px', background: '#6F3BCE',
                                borderRadius: '80px', border: 'none', cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '16px',
                                color: '#FFFFFF',
                            }}
                        >
                            Complete Profile
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowIncomplete(false)}
                            style={{
                                marginTop: '12px', background: 'none', border: 'none',
                                fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '14px',
                                color: '#000', opacity: 0.5, cursor: 'pointer',
                            }}
                        >
                            Later
                        </button>
                    </div>
                </div>
            )}

            {/* AWS Rekognition Selfie Verification Modal */}
            <AwsSelfieVerificationModal
                isOpen={showSelfieModal}
                onClose={() => setShowSelfieModal(false)}
                onVerificationSuccess={(updatedUser) => {
                    setIsUserVerified(true);
                    setShowSelfieModal(false);
                }}
            />
        </div>
    );
};


export default DiscoveryPage;
