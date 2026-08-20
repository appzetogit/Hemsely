import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Ban, ChevronLeft, ChevronRight, ImageIcon, Mail, Phone, Search, ShieldCheck, Users, FileText, Layers, X } from 'lucide-react';
import adminApi from '../services/adminApi';

const PAGE_SIZE = 8;

const ModerationImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return ReactDOM.createPortal(
        <div
            className="fixed top-16 md:left-72 left-0 right-0 bottom-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
            onClick={onClose}
        >
            <div
                className="max-w-3xl w-full rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    aria-label="Close image modal"
                    className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors border-0 cursor-pointer text-xs"
                    onClick={onClose}
                >
                    <X className="w-4 h-4" />
                </button>
                <img src={imageUrl} alt="User upload preview" className="w-full max-h-[80vh] object-contain bg-zinc-900" />
            </div>
        </div>,
        document.body
    );
};

const extractUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (typeof img === 'object' && img.url) return img.url;
    return null;
};

const ModerationUserCard = ({ user, banReason, onBanReasonChange, onBanToggle, onSelectImage }) => {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'User';
    const profilePhoto = extractUrl(user.profilePhoto || user.profilePicture);
    const photosList = (user.photos || user.galleryImages || []).map(extractUrl).filter(Boolean);
    const allImages = [profilePhoto, ...photosList].filter(Boolean);
    const avatarInitial = (user.firstName || user.name || 'U').charAt(0).toUpperCase();

    return (
        <article className="rounded-lg border border-zinc-200 bg-white p-2.5 sm:p-3 shadow-sm">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                    <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-zinc-600 text-sm">
                            {profilePhoto ? (
                                <img src={profilePhoto} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                avatarInitial
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-xs sm:text-sm font-bold text-zinc-900">{displayName}</h3>
                                {user.isBanned ? (
                                    <span className="inline-flex items-center rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                                        Banned
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                                        Active
                                    </span>
                                )}
                                {user.isPremium && (
                                    <span className="inline-flex items-center rounded bg-amber-100/80 text-amber-800 px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                                        Premium
                                    </span>
                                )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-2.5 text-[11px] font-medium text-zinc-500">
                                {user.email && (
                                    <div className="flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-zinc-400" />
                                        <span>{user.email}</span>
                                    </div>
                                )}
                                {user.phoneNumber && (
                                    <div className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-zinc-400" />
                                        <span>{user.phoneNumber}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {user.isBanned && (
                        <div className="rounded-md bg-red-50 border border-red-100 px-2.5 py-1.5 text-[11px] text-red-700">
                            <span className="font-bold">Ban reason:</span> {user.banReason || 'Banned by admin panel'}
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                            <ImageIcon className="w-3 h-3" />
                            Uploaded Images ({allImages.length})
                        </div>

                        {allImages.length ? (
                            <div className="flex flex-wrap gap-1.5">
                                {allImages.map((imageUrl, idx) => (
                                    <button
                                        key={`${idx}-${String(imageUrl).slice(-30)}`}
                                        type="button"
                                        onClick={() => onSelectImage(imageUrl)}
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden border border-zinc-200 bg-zinc-50 hover:opacity-80 transition-opacity shadow-sm"
                                    >
                                        <img src={imageUrl} alt="User upload" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11px] font-medium text-zinc-400 border border-dashed border-zinc-200 rounded-md py-1 px-2.5 inline-block bg-zinc-50">
                                No uploaded images yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full xl:w-[220px] shrink-0 rounded-md border border-zinc-200 bg-zinc-50 p-2 space-y-2 shadow-sm">
                    <div>
                        <h4 className="text-[11px] font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-1">Moderation Action</h4>
                        <p className="text-[10px] text-zinc-500 font-medium leading-tight">
                            Banning restricts login access for this account.
                        </p>
                    </div>

                    {!user.isBanned && (
                        <div>
                            <label htmlFor={`ban-reason-${user._id}`} className="sr-only">Reason for ban</label>
                            <textarea
                                id={`ban-reason-${user._id}`}
                                value={banReason || ''}
                                onChange={(e) => onBanReasonChange(user._id, e.target.value)}
                                rows="2"
                                aria-label="Reason for ban"
                                placeholder="Reason for ban (required)..."
                                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                            />
                        </div>
                    )}

                    {user.isBanned ? (
                        <button
                            type="button"
                            onClick={() => onBanToggle(user, false)}
                            className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-white border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors shadow-sm text-[11px]"
                        >
                            <ShieldCheck className="w-3 h-3" />
                            Unban User
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onBanToggle(user, true)}
                            className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-sm text-[11px]"
                        >
                            <Ban className="w-3 h-3" />
                            Ban User
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

const ModerationPage = () => {
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalUsers: 0 });
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [banReasons, setBanReasons] = useState({});

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError('');

        const query = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE),
        });

        if (search.trim()) {
            query.set('search', search.trim());
        }

        adminApi.get(`/admin/users?${query.toString()}`)
            .then(({ data, ok }) => {
                if (!isMounted) return;
                if (!ok) {
                    throw new Error(data.message || 'Unable to load users');
                }
                setUsers(data.users || []);
                setPagination(data.pagination || { page, totalPages: 1, totalUsers: 0 });
            })
            .catch((fetchError) => {
                if (isMounted) setError(fetchError.message);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [page, search]);

    const submitSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput);
    };

    const handleBanReasonChange = useCallback((userId, reason) => {
        setBanReasons((current) => ({
            ...current,
            [userId]: reason,
        }));
    }, []);

    const handleBanToggle = async (user, shouldBan) => {
        setActionMessage('');
        setError('');

        try {
            const endpoint = shouldBan ? `/admin/users/${user._id}/ban` : `/admin/users/${user._id}/unban`;
            const { data, ok } = await adminApi.patch(
                endpoint,
                shouldBan
                    ? { reason: banReasons[user._id]?.trim() || 'Banned by admin moderation panel' }
                    : {}
            );

            if (!ok) {
                throw new Error(data.message || 'Unable to update user status');
            }

            setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                    currentUser._id === user._id ? data.user : currentUser
                )
            );
            setActionMessage(data.message || 'User updated successfully');
        } catch (actionError) {
            setError(actionError.message);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Content & Account Moderation</h1>
                    <p className="text-[11px] text-zinc-500">Review user accounts, photos, and manage account statuses.</p>
                </div>
            </div>

            <form onSubmit={submitSearch} className="flex gap-1.5 max-w-xs">
                <div className="relative flex-1">
                    <label htmlFor="mod-search" className="sr-only">Search accounts</label>
                    <input
                        id="mod-search"
                        type="text"
                        aria-label="Search accounts"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search name, email, or phone..."
                        className="w-full rounded-md border border-zinc-300 bg-white pl-8 pr-2.5 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                    <Search className="w-3 h-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                    type="submit"
                    className="px-3 py-1 rounded-md bg-zinc-900 text-white font-bold text-xs hover:bg-black transition-colors shadow-sm"
                >
                    Search
                </button>
            </form>

            {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700 font-medium">
                    {error}
                </div>
            )}

            {actionMessage && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-700 font-medium">
                    {actionMessage}
                </div>
            )}

            <div className="space-y-2">
                {loading ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-500 text-xs font-medium">
                        Loading moderation records...
                    </div>
                ) : users.length === 0 ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-500 text-xs font-medium">
                        No accounts found matching search criteria.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {users.map((user) => (
                            <ModerationUserCard
                                key={user._id}
                                user={user}
                                banReason={banReasons[user._id]}
                                onBanReasonChange={handleBanReasonChange}
                                onBanToggle={handleBanToggle}
                                onSelectImage={setSelectedImage}
                            />
                        ))}
                    </div>
                )}
            </div>

            {users.length > 0 && (
                <div className="flex items-center justify-between rounded-md bg-white shadow-sm border border-zinc-200 px-3 py-2">
                    <button
                        type="button"
                        onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 bg-white text-zinc-700 text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                    >
                        <ChevronLeft className="w-3 h-3" />
                        Previous
                    </button>

                    <div className="text-[11px] font-semibold text-zinc-600">
                        Page {pagination.page} of {pagination.totalPages}
                    </div>

                    <button
                        type="button"
                        onClick={() => setPage((currentPage) => Math.min(currentPage + 1, pagination.totalPages))}
                        disabled={page >= pagination.totalPages}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 bg-white text-zinc-700 text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                    >
                        Next
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            )}

            <ModerationImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
        </div>
    );
};

export default ModerationPage;
