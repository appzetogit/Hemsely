import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import { devError } from '../../../shared/utils/logger';

const BlockedAccountsPage = () => {
    const navigate = useNavigate();
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unblockingId, setUnblockingId] = useState(null);

    const fetchBlockedUsers = async () => {
        const uId = localStorage.getItem('userId');
        if (!uId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, ok } = await apiClient.get(`/users/${uId}/blocked`);
            if (ok && data?.blockedUsers) {
                setBlockedUsers(data.blockedUsers);
            }
        } catch (err) {
            devError('Failed to fetch blocked users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const handleUnblock = async (blockedUserId) => {
        const uId = localStorage.getItem('userId');
        if (!uId) return;
        setUnblockingId(blockedUserId);
        try {
            const { ok, data } = await apiClient.post(`/users/${uId}/unblock/${blockedUserId}`);
            if (ok) {
                setBlockedUsers((prev) => prev.filter((u) => (u._id || u.id) !== blockedUserId));
            } else {
                alert(data?.message || 'Failed to unblock user.');
            }
        } catch (err) {
            devError('Error unblocking user:', err);
            alert('Failed to unblock user.');
        } finally {
            setUnblockingId(null);
        }
    };

    return (
        <div className="h-screen bg-[#FCFCFC] flex flex-col max-w-[414px] mx-auto overflow-hidden relative">
            {/* Header */}
            <header className="relative flex items-center justify-between px-4 shrink-0 bg-[#FCFCFC] border-b border-gray-100 shadow-2xs" style={{ height: '52px' }}>
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors border-0 cursor-pointer"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className="font-bold text-[17px] text-black tracking-tight text-center flex-1">
                    Blocked Accounts
                </h1>
                <div className="w-10" />
            </header>

            {/* Content Body */}
            <main className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {loading ? (
                    <div className="py-20 text-center text-gray-400 text-[14px]">
                        Loading blocked accounts...
                    </div>
                ) : blockedUsers.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-3xl mb-4 border border-red-100">
                            🚫
                        </div>
                        <h2 className="font-extrabold text-gray-900 text-[17px]">No Blocked Accounts</h2>
                        <p className="text-gray-400 text-[13.5px] mt-1.5 max-w-[260px] leading-relaxed">
                            Accounts you block will appear here. You can unblock them anytime.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
                            {blockedUsers.length} {blockedUsers.length === 1 ? 'Blocked Account' : 'Blocked Accounts'}
                        </p>
                        {blockedUsers.map((u) => {
                            const uId = u._id || u.id;
                            const uName = u.firstName || u.name || 'User';
                            const rawPhoto = u.profilePicture || u.galleryImages?.[0];
                            const photo = typeof rawPhoto === 'string' ? rawPhoto : rawPhoto?.url;

                            return (
                                <div
                                    key={uId}
                                    className="flex items-center justify-between p-3 rounded-[18px] bg-white border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {photo ? (
                                            <img
                                                src={photo}
                                                alt=""
                                                className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-[#733FE0]/10 text-[#733FE0] font-bold flex items-center justify-center text-[16px] shrink-0 border border-[#733FE0]/20">
                                                {uName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-extrabold text-[15px] text-gray-900 truncate tracking-tight">
                                                {uName}{u.age ? `, ${u.age}` : ''}
                                            </p>
                                            <p className="text-[12px] text-gray-400 truncate mt-0.5">
                                                {u.email || u.phone || 'Blocked account'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={unblockingId === uId}
                                        onClick={() => handleUnblock(uId)}
                                        className="ml-3 px-4 py-2 rounded-full bg-white border border-[#733FE0] text-[13px] font-bold text-[#733FE0] hover:bg-[#F6F1FE] active:scale-[0.97] transition-all shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs"
                                    >
                                        {unblockingId === uId ? 'Unblocking...' : 'Unblock'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BlockedAccountsPage;
