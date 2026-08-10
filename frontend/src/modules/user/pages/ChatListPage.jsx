import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import apiClient from '../../../shared/services/apiClient';
import { useSocket } from '../context/SocketContext';

import demoPhoto from '../assets/6ee1ef9d2677e06049fb899a7658f4b9ac9c11dc.jpg';

const getMyId = () => {
    try {
        const sUser = sessionStorage.getItem('user');
        if (sUser) {
            const parsed = JSON.parse(sUser);
            if (parsed._id || parsed.id) return String(parsed._id || parsed.id);
        }
        const sId = sessionStorage.getItem('userId');
        if (sId) return String(sId);

        const lUser = localStorage.getItem('user');
        if (lUser) {
            const parsed = JSON.parse(lUser);
            if (parsed._id || parsed.id) return String(parsed._id || parsed.id);
        }
        return String(localStorage.getItem('userId') || '');
    } catch {
        return String(sessionStorage.getItem('userId') || localStorage.getItem('userId') || '');
    }
};

const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
};

/* ─── Match Avatar Component ─── */
const MatchAvatar = ({ match, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={match.isLikesYou ? "View likes" : `Match ${match.name}`}
        className="flex flex-col items-center shrink-0 cursor-pointer bg-transparent border-0 p-0 active:scale-95 transition-transform"
    >
        <div className="relative w-[64px] h-[64px]">
            {match.isLikesYou ? (
                <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-[#9B51E0] via-[#E05286] to-[#FF7A60] shadow-xs flex items-center justify-center relative overflow-hidden">
                    <img src={match.photo} alt="" className="w-full h-full rounded-[22px] object-cover filter blur-[3px] opacity-40 scale-110" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    </div>
                </div>
            ) : (
                <div className="w-full h-full rounded-[22px] p-[2.5px] border-[1.8px] border-[#8C52FF] flex items-center justify-center bg-white shadow-2xs">
                    <img src={match.photo} alt="" className="w-full h-full rounded-[18px] object-cover" />
                </div>
            )}
        </div>
        <span className="text-[12px] font-medium text-gray-800 tracking-tight text-center max-w-[64px] truncate mt-1.5">
            {match.name}
        </span>
    </button>
);

/* ─── Chat Item Component ─── */
const ChatItem = ({ chat, onClick, onHold }) => {
    const timerRef = useRef(null);
    const isLongPress = useRef(false);

    const startPress = () => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            if (onHold) onHold(chat);
        }, 500);
    };

    const cancelPress = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handleClick = (e) => {
        if (isLongPress.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress}
            onContextMenu={(e) => { e.preventDefault(); if (onHold) onHold(chat); }}
            aria-label={`Chat with ${chat.name}`}
            className="w-full px-5 py-3 hover:bg-purple-50/40 active:bg-purple-50/70 transition-colors flex items-center gap-3.5 border-b border-gray-50/80 cursor-pointer bg-transparent text-left relative select-none"
        >
            {chat.isUnmatched ? (
                <div className="w-[54px] h-[54px] rounded-full bg-gray-200 border border-gray-100 shadow-xs flex items-center justify-center text-gray-400 shrink-0">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </div>
            ) : (
                <div className="relative shrink-0">
                    <img src={chat.photo} alt="" className="w-[54px] h-[54px] rounded-full object-cover border border-gray-100 shadow-xs" />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-gray-900 tracking-tight truncate leading-tight">
                        {chat.name}
                    </h3>
                    <span className="text-[11px] text-gray-400 font-medium shrink-0">
                        {chat.time}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                    <p className={`text-[13px] truncate leading-tight ${chat.unread ? 'text-[#703DE2] font-bold' : 'text-gray-500 font-normal'}`}>
                        {chat.message}
                    </p>
                    {chat.unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#703DE2] text-white text-[10px] font-extrabold shadow-xs shrink-0 min-w-[18px] text-center">
                            {chat.unread}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

const GENDER_OPTIONS = ['Male', 'Female', 'Both'];
const RELATIONSHIP_GOAL_OPTIONS = ['Any', 'Long-term', 'Short-term', 'New friends', 'Casual'];
const RELIGION_OPTIONS = ['Any', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Atheist', 'Other'];
const EDUCATION_OPTIONS = ['Any', 'Graduate', 'Post Graduate', 'Undergraduate', 'High School'];
const HABIT_OPTIONS = ['Any', 'No', 'Yes', 'Occasionally', 'Socially'];

// Height is stored/filtered in cm; this only formats cm for display.
const cmToFeetInches = (cm) => {
    let feet = Math.floor(cm / 30.48);
    let inches = Math.round((cm % 30.48) / 2.54);
    if (inches === 12) {
        feet += 1;
        inches = 0;
    }
    return `${feet}' ${inches}"`;
};

const DEFAULT_FILTERS = {
    gender: 'both',
    distanceKm: 100,
    ageMin: 18,
    ageMax: 60,
    heightMinCm: 140,
    heightMaxCm: 220,
    relationshipGoal: '',
    religion: '',
    education: '',
    drinkingStatus: '',
    smokingStatus: '',
};

/* ─── Chat Filter Modal Component ─── */
const FilterModal = ({ appliedFilters, defaultFilters, onApply, onClose, isPremium, onUpgrade }) => {
    const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'advance'
    const [draft, setDraft] = useState({ ...appliedFilters });

    const handleAdvanceTabClick = () => {
        setActiveTab('advance');
    };

    const updateDraft = (key, val) => {
        setDraft((prev) => ({ ...prev, [key]: val }));
    };

    const pillSelector = (options, field, valueMap = (x) => (x === 'Any' ? '' : x)) => (
        <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => {
                const val = valueMap(opt);
                const selected = draft[field] === val;
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => updateDraft(field, val)}
                        className={`py-1.5 px-3 rounded-full font-semibold text-[12px] border cursor-pointer transition-all text-center ${
                            selected
                                ? 'bg-[#703DE2] text-white border-[#703DE2] shadow-2xs'
                                : 'bg-white text-gray-900 border-[#D8C6FE] hover:border-[#703DE2]'
                        }`}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none max-w-[414px] mx-auto overflow-hidden"
            onClick={onClose}
        >
            <div
                className="w-full bg-white rounded-t-[32px] px-5 pt-5 pb-6 shadow-2xl flex flex-col max-h-[85vh] border-t border-gray-100 animate-in slide-in-from-bottom duration-250 overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Switcher Pill Tabs */}
                <div className="bg-[#F3EEFC] rounded-full p-0.5 flex items-center mb-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-2 px-3 rounded-full font-bold text-[13px] transition-all border-0 cursor-pointer text-center ${
                            activeTab === 'basic'
                                ? 'bg-[#703DE2] text-white shadow-xs'
                                : 'bg-transparent text-gray-900 hover:text-[#703DE2]'
                        }`}
                    >
                        Basic Filter
                    </button>
                    <button
                        type="button"
                        onClick={handleAdvanceTabClick}
                        className={`flex-1 py-2 px-3 rounded-full font-bold text-[13px] transition-all border-0 cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                            activeTab === 'advance'
                                ? 'bg-[#703DE2] text-white shadow-xs'
                                : 'bg-transparent text-gray-900 hover:text-[#703DE2]'
                        }`}
                    >
                        Advance Filter
                        {!isPremium && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Middle Content */}
                {activeTab === 'basic' ? (
                    <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-0.5 space-y-3 pb-2">
                        {/* Section 1: Interested in */}
                        <div className="mb-3">
                            <h3 className="font-bold text-[14px] text-gray-900 mb-2">Interested in</h3>
                            <div className="flex gap-2">
                                {GENDER_OPTIONS.map((opt) => {
                                    const val = opt.toLowerCase();
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => updateDraft('gender', val)}
                                            className={`flex-1 py-2 px-3 rounded-full font-semibold text-[12.5px] border cursor-pointer transition-all text-center ${
                                                draft.gender === val
                                                    ? 'bg-[#703DE2] text-white border-[#703DE2] shadow-2xs'
                                                    : 'bg-white text-gray-900 border-[#D8C6FE] hover:border-[#703DE2]'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section 2: Distance */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-[14px] text-gray-900">Distance</h3>
                                <span className="text-[12.5px] font-medium text-gray-600">up to {draft.distanceKm}km</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={draft.distanceKm}
                                onChange={(e) => updateDraft('distanceKm', Number(e.target.value))}
                                className="w-full accent-[#703DE2] bg-gray-200 h-1.5 rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Section 3: Height Range */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-[14px] text-gray-900">Height Range</h3>
                                <span className="text-[12.5px] font-medium text-gray-600">
                                    {cmToFeetInches(draft.heightMinCm)} - {cmToFeetInches(draft.heightMaxCm)}
                                </span>
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium">Min</span>
                            <input
                                type="range"
                                min="140"
                                max="220"
                                value={draft.heightMinCm}
                                onChange={(e) => updateDraft('heightMinCm', Math.min(Number(e.target.value), draft.heightMaxCm))}
                                className="w-full accent-[#703DE2] bg-[#E4D7FE] h-1.5 rounded-lg cursor-pointer"
                            />
                            <span className="text-[11px] text-gray-500 font-medium">Max</span>
                            <input
                                type="range"
                                min="140"
                                max="220"
                                value={draft.heightMaxCm}
                                onChange={(e) => updateDraft('heightMaxCm', Math.max(Number(e.target.value), draft.heightMinCm))}
                                className="w-full accent-[#703DE2] bg-[#E4D7FE] h-1.5 rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Section 4: Age Range */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-[14px] text-gray-900">Age Range</h3>
                                <span className="text-[12.5px] font-medium text-gray-600">{draft.ageMin}-{draft.ageMax}</span>
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium">Min</span>
                            <input
                                type="range"
                                min="18"
                                max="60"
                                value={draft.ageMin}
                                onChange={(e) => updateDraft('ageMin', Math.min(Number(e.target.value), draft.ageMax))}
                                className="w-full accent-[#703DE2] bg-[#E4D7FE] h-1.5 rounded-lg cursor-pointer"
                            />
                            <span className="text-[11px] text-gray-500 font-medium">Max</span>
                            <input
                                type="range"
                                min="18"
                                max="60"
                                value={draft.ageMax}
                                onChange={(e) => updateDraft('ageMax', Math.max(Number(e.target.value), draft.ageMin))}
                                className="w-full accent-[#703DE2] bg-[#E4D7FE] h-1.5 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>
                ) : (
                    /* Advance Filter Options - Non Scrollable in Locked State */
                    <div className="flex-1 relative overflow-hidden my-1 flex flex-col justify-center min-h-0">
                        <div
                            className={`flex flex-col gap-2.5 overflow-hidden ${!isPremium ? 'filter blur-[4px] opacity-60 pointer-events-none select-none max-h-[300px]' : 'overflow-y-auto'}`}
                        >
                            <div>
                                <h4 className="font-semibold text-[12px] text-gray-900 mb-1">What are they looking for?</h4>
                                {pillSelector(RELATIONSHIP_GOAL_OPTIONS, 'relationshipGoal')}
                            </div>
                            <div>
                                <h4 className="font-semibold text-[12px] text-gray-900 mb-1">Religious beliefs</h4>
                                {pillSelector(RELIGION_OPTIONS, 'religion')}
                            </div>
                            <div>
                                <h4 className="font-semibold text-[12px] text-gray-900 mb-1">Education</h4>
                                {pillSelector(EDUCATION_OPTIONS, 'education')}
                            </div>
                            <div>
                                <h4 className="font-semibold text-[12px] text-gray-900 mb-1">Drinking</h4>
                                {pillSelector(HABIT_OPTIONS, 'drinkingStatus')}
                            </div>
                            <div>
                                <h4 className="font-semibold text-[12px] text-gray-900 mb-1">Smoking</h4>
                                {pillSelector(HABIT_OPTIONS, 'smokingStatus')}
                            </div>
                        </div>

                        {!isPremium && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center gap-2 p-3 bg-white/30 rounded-2xl">
                                <div className="w-12 h-12 rounded-full bg-[#703DE2] text-white flex items-center justify-center shadow-lg">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                </div>
                                <h4 className="font-bold text-[15px] text-gray-900 drop-shadow-sm">Advance Filter is for Premium</h4>
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom Action Buttons - Fixed & Raised */}
                <div className="pt-3 pb-3 shrink-0 flex gap-2.5 mt-auto">
                    {activeTab === 'advance' && !isPremium ? (
                        <button
                            type="button"
                            onClick={onUpgrade}
                            className="w-full h-[46px] rounded-full bg-gradient-to-r from-[#703DE2] to-[#8C52FF] text-white font-extrabold text-[15px] shadow-md shadow-purple-200 cursor-pointer border-0 tracking-wide active:scale-[0.98] transition-all flex items-center justify-center"
                        >
                            Unlock Premium
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setDraft({ ...defaultFilters })}
                                className="flex-1 h-[46px] rounded-full bg-white border border-[#D8C6FE] text-[#703DE2] font-extrabold text-[14.5px] cursor-pointer tracking-wide active:scale-[0.98] transition-all"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onApply(draft);
                                    onClose();
                                }}
                                className="flex-[2] h-[46px] rounded-full bg-[#703DE2] hover:bg-[#602ec3] text-white font-extrabold text-[14.5px] shadow-md shadow-purple-200 cursor-pointer border-0 tracking-wide active:scale-[0.98] transition-all"
                            >
                                Apply
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Builds the /messages/conversations querystring, only including params that
// actually diverge from the no-op defaults so an untouched filter sends no params.
const buildConversationsQuery = (filters) => {
    const params = new URLSearchParams();
    if (filters.gender !== DEFAULT_FILTERS.gender) params.set('gender', filters.gender);
    if (filters.distanceKm !== DEFAULT_FILTERS.distanceKm) params.set('distanceKm', filters.distanceKm);
    if (filters.ageMin !== DEFAULT_FILTERS.ageMin) params.set('ageMin', filters.ageMin);
    if (filters.ageMax !== DEFAULT_FILTERS.ageMax) params.set('ageMax', filters.ageMax);
    if (filters.heightMinCm !== DEFAULT_FILTERS.heightMinCm) params.set('heightMinCm', filters.heightMinCm);
    if (filters.heightMaxCm !== DEFAULT_FILTERS.heightMaxCm) params.set('heightMaxCm', filters.heightMaxCm);
    ['relationshipGoal', 'religion', 'education', 'drinkingStatus', 'smokingStatus'].forEach((key) => {
        if (filters[key]) params.set(key, filters[key]);
    });
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};

/* ─── Chat List Page ─── */
const ChatListPage = () => {
    const navigate = useNavigate();
    const { socket } = useSocket() || {};
    const [matches, setMatches] = useState([]);
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilter, setShowFilter] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [isPremium, setIsPremium] = useState(() => {
        try {
            const storedUser = JSON.parse(
                localStorage.getItem('user') || sessionStorage.getItem('user') || '{}'
            );
            return !!(storedUser.isPremium || storedUser.isSuperSubscriber || storedUser.isSuperUser);
        } catch {
            return false;
        }
    });
    const [chatToDelete, setChatToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const hasActiveFilter = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

    useEffect(() => {
        const myId = getMyId();
        if (!myId) return;
        apiClient.get(`/users/${myId}`).then(({ data, ok }) => {
            if (ok && data?.user) {
                const u = data.user;
                setIsPremium(!!(u.isPremium || u.isSuperSubscriber || u.isSuperUser));
            }
        }).catch(() => {});
    }, []);

    const loadData = useCallback(async () => {
        const myId = getMyId();
        const [matchesRes, conversationsRes] = await Promise.all([
            apiClient.get('/matches'),
            apiClient.get(`/messages/conversations${buildConversationsQuery(filters)}`),
        ]);

        if (matchesRes.ok && matchesRes.data.success) {
            setMatches(
                matchesRes.data.matches.map((m) => {
                    const other = String(m.user1?._id) === String(myId) ? m.user2 : m.user1;
                    return {
                        id: other?._id,
                        name: other?.firstName || 'Match',
                        photo: other?.profilePicture || demoPhoto,
                    };
                }).filter((m) => m.id)
            );
        }

        if (conversationsRes.ok && conversationsRes.data.success) {
            setChats(
                conversationsRes.data.conversations.map((c) => ({
                    id: c.otherUser?._id,
                    name: c.isUnmatched ? 'Hemsely User' : (c.otherUser?.firstName || 'User'),
                    photo: c.isUnmatched ? demoPhoto : (c.otherUser?.profilePicture || demoPhoto),
                    message: c.lastMessageImage ? '📷 Photo' : (c.lastMessage || ''),
                    time: timeAgo(c.lastMessageTime),
                    unread: c.unreadCount || 0,
                    isUnmatched: !!c.isUnmatched,
                }))
            );
        }

        setLoading(false);
    }, [filters]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    // Refresh the chat list whenever a new message arrives anywhere (respects the currently active filters)
    useEffect(() => {
        if (!socket) return undefined;
        const onNewMessage = () => loadData();
        socket.on('new_message', onNewMessage);
        socket.on('new_match', onNewMessage);
        socket.on('user_unmatched', onNewMessage);
        return () => {
            socket.off('new_message', onNewMessage);
            socket.off('new_match', onNewMessage);
            socket.off('user_unmatched', onNewMessage);
        };
    }, [socket, loadData]);

    const handleDeleteChat = async () => {
        if (!chatToDelete) return;
        setDeleting(true);
        try {
            const { ok } = await apiClient.delete(`/messages/conversation/${chatToDelete.id}`);
            if (ok) {
                setChats((prev) => prev.filter((c) => String(c.id) !== String(chatToDelete.id)));
            } else {
                alert('Failed to delete chat.');
            }
        } catch (err) {
            console.error('Error deleting chat:', err);
        } finally {
            setDeleting(false);
            setChatToDelete(null);
        }
    };

    const avatarRow = [
        { id: 'likes', name: 'Likes you', photo: demoPhoto, isLikesYou: true },
        ...matches,
    ];

    return (
        <div className="h-[100dvh] flex flex-col max-w-[414px] mx-auto bg-[#FAFAFD] overflow-hidden select-none">

            {/* Header */}
            <header
                className="relative flex items-center justify-center px-6 shrink-0 bg-white shadow-2xs rounded-b-[20px] h-[52px] z-10"
            >
                <h1 className="font-bold text-[18px] text-gray-900 tracking-tight text-center">
                    Chat
                </h1>
                <button
                    type="button"
                    aria-label="Filter chats"
                    onClick={() => setShowFilter(true)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-[#703DE2] hover:opacity-80 transition-opacity cursor-pointer border-0 bg-transparent flex items-center justify-center"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="6" x2="20" y2="6" />
                        <circle cx="9" cy="6" r="2.5" fill="#703DE2" stroke="white" strokeWidth="1.8" />
                        <line x1="4" y1="18" x2="20" y2="18" />
                        <circle cx="15" cy="18" r="2.5" fill="#703DE2" stroke="white" strokeWidth="1.8" />
                    </svg>
                    {hasActiveFilter && (
                        <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-[#703DE2] border border-white" />
                    )}
                </button>
            </header>

            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto pb-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                {/* Your Matches Section */}
                <div className="px-5 pt-3 pb-1.5">
                    <h2 className="text-[14.5px] font-bold text-gray-900 tracking-tight">
                        Your Matches {matches.length > 0 && `(${matches.length})`}
                    </h2>
                </div>

                <div className="flex gap-3.5 px-5 py-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {avatarRow.map(m => (
                        <MatchAvatar
                            key={m.id}
                            match={m}
                            onClick={() => m.isLikesYou ? navigate('/likes') : navigate(`/chat/${m.id}`, { state: { name: m.name, photo: m.photo } })}
                        />
                    ))}
                </div>

                {/* Chats label */}
                <div className="px-5 pt-1 pb-1 mt-1">
                    <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">
                        Chats
                    </h2>
                </div>

                {/* Chat list */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 rounded-full border-4 border-[#F0EBFB] border-t-[#703DE2] animate-spin" />
                    </div>
                ) : chats.length === 0 ? (
                    <p className="text-center text-[13px] text-gray-400 font-medium py-10 px-6">
                        {hasActiveFilter
                            ? 'No chats match your filters.'
                            : 'No conversations yet. Match with someone and say hello!'}
                    </p>
                ) : (
                    <div className="divide-y divide-gray-100/60">
                        {chats.map((chat) => (
                            <ChatItem
                                key={chat.id}
                                chat={chat}
                                onClick={() => navigate(`/chat/${chat.id}`, { state: { name: chat.name, photo: chat.photo, isUnmatched: chat.isUnmatched } })}
                                onHold={(targetChat) => setChatToDelete(targetChat)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Chat Filter Modal */}
            {showFilter && (
                <FilterModal
                    appliedFilters={filters}
                    defaultFilters={DEFAULT_FILTERS}
                    onApply={setFilters}
                    onClose={() => setShowFilter(false)}
                    isPremium={isPremium}
                    onUpgrade={() => { setShowFilter(false); navigate('/premium'); }}
                />
            )}

            {/* Delete Chat Modal */}
            {chatToDelete && (
                <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-5 max-w-[340px] w-full text-center shadow-xl animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3 text-xl">
                            🗑️
                        </div>
                        <h3 className="font-bold text-[16px] text-gray-900 mb-1">
                            Delete Chat?
                        </h3>
                        <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
                            Delete conversation with <span className="font-semibold text-gray-800">{chatToDelete.name}</span>? This will remove this chat from your list.
                        </p>
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setChatToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-700 font-semibold text-[13px] cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteChat}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-[13px] cursor-pointer border-0 shadow-md shadow-red-200"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNavigation activeTab="chats" />
        </div>
    );
};

export default ChatListPage;
