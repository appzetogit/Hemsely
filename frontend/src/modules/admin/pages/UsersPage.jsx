import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search, Star, UserRound, Crown, Gem } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';
import { Button } from '../../../shared/components/ui/Button';

const PAGE_SIZE = 8;

const DetailRow = ({ label, value }) => (
    <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
        <div className="text-sm font-semibold text-zinc-900 break-words">{value || 'Not provided'}</div>
    </div>
);

const UserDetailModal = ({ user, onClose, onToggleStatus, statusSaving }) => {
    if (!user) return null;
    const gallery = [user.profilePicture, ...((user.galleryImages || []).map((img) => img.url))].filter(Boolean);

    return (
        <div
            className="fixed inset-0 z-[150] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-6 md:p-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Area */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 border-b border-zinc-100 pb-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 font-bold text-xl shadow-sm">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.firstName || 'User'} className="w-full h-full object-cover" />
                            ) : (
                                <UserRound className="w-8 h-8" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight leading-tight">
                                {user.firstName} {user.lastName}
                            </h2>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${user.subscriptionName === 'Premium' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                                    {user.subscriptionName}
                                </span>
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${user.isBanned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {user.isBanned ? 'Banned' : 'Active'}
                                </span>
                                {user.isSuperUser && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 text-violet-800 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                                        <Crown className="w-3 h-3" /> Super User
                                    </span>
                                )}
                                {user.isSuperSubscriber && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-cyan-100 text-cyan-800 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                                        <Gem className="w-3 h-3" /> Super Subscriber
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 hover:text-black transition-colors"
                    >
                        Close Profile
                    </button>
                </div>

                {/* Admin-assignable status badges */}
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Admin Status:</span>
                    <Button
                        size="sm"
                        variant={user.isSuperUser ? 'primary' : 'outline'}
                        disabled={statusSaving}
                        onClick={() => onToggleStatus(user, 'isSuperUser', !user.isSuperUser)}
                    >
                        <Crown className="w-3.5 h-3.5" /> {user.isSuperUser ? 'Remove Super User' : 'Make Super User'}
                    </Button>
                    <Button
                        size="sm"
                        variant={user.isSuperSubscriber ? 'primary' : 'outline'}
                        disabled={statusSaving}
                        onClick={() => onToggleStatus(user, 'isSuperSubscriber', !user.isSuperSubscriber)}
                    >
                        <Gem className="w-3.5 h-3.5" /> {user.isSuperSubscriber ? 'Remove Super Subscriber' : 'Make Super Subscriber'}
                    </Button>
                </div>

                {/* Detail Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                    <DetailRow label="Email Address" value={user.email} />
                    <DetailRow label="Phone Number" value={user.phoneNumber} />
                    <DetailRow label="Age" value={user.age} />
                    <DetailRow label="Gender" value={user.gender} />
                    <DetailRow label="Relationship Goal" value={user.relationshipGoal} />
                    <DetailRow label="Education" value={user.education} />
                    <DetailRow label="Profession" value={user.profession} />
                    <DetailRow label="Location" value={[user.location?.city, user.location?.state, user.location?.address].filter(Boolean).join(', ')} />
                    <DetailRow label="Smoking" value={user.smokingStatus} />
                    <DetailRow label="Drinking" value={user.drinkingStatus} />
                    <DetailRow label="Verified" value={user.isVerified ? 'Yes' : 'No'} />
                    <DetailRow label="Join Date" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''} />
                </div>

                {/* Bio Block */}
                <div className="mt-6 rounded-xl bg-zinc-50 border border-zinc-100 p-5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2">Biography</div>
                    <div className="text-sm font-medium text-zinc-800 leading-relaxed">{user.bio || 'No bio provided.'}</div>
                </div>

                {/* Interests Block */}
                <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-100 p-5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-3">Interests & Hobbies</div>
                    <div className="flex flex-wrap gap-2">
                        {(user.interests || []).length ? (
                            user.interests.map((interest) => (
                                <span key={interest} className="inline-flex items-center rounded-full bg-white border border-zinc-200 text-zinc-700 px-3 py-1 text-[11px] font-bold shadow-sm">
                                    {interest}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-zinc-500 font-medium">No interests specified.</span>
                        )}
                    </div>
                </div>

                {/* Gallery Block */}
                <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-100 p-5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-4">Gallery Images</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                        {gallery.length ? (
                            gallery.map((imageUrl, idx) => (
                                <div key={`${idx}-${imageUrl.slice(-40)}`} className="aspect-square rounded-xl overflow-hidden border border-zinc-200 bg-white shadow-sm hover:scale-105 transition-transform">
                                    <img src={imageUrl} alt="User gallery" className="w-full h-full object-cover" />
                                </div>
                            ))
                        ) : (
                            <span className="text-sm col-span-full text-zinc-500 font-medium">No gallery images uploaded.</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalUsers: 0 });
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [statusSaving, setStatusSaving] = useState(false);

    const handleToggleStatus = async (user, field, value) => {
        setStatusSaving(true);
        const { data, ok } = await adminApi.patch(`/admin/users/${user._id}/status`, { [field]: value });
        setStatusSaving(false);
        if (ok && data.success) {
            setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, [field]: value } : u)));
            setSelectedUser((prev) => (prev && prev._id === user._id ? { ...prev, [field]: value } : prev));
        }
    };

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

    const handleSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Users Management</h1>
                    <p className="text-sm text-zinc-500 mt-1 flex items-center">
                        Browse all platform users and review account details.
                    </p>
                </div>

                <form onSubmit={handleSearch} className="w-full xl:w-[320px]">
                    <div className="relative">
                        <label htmlFor="users-search" className="sr-only">Search users</label>
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            id="users-search"
                            type="text"
                            aria-label="Search users"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search users..."
                            className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors shadow-sm"
                        />
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Users</p>
                        <p className="text-2xl font-medium text-zinc-900 mt-1 leading-none">{pagination.totalUsers}</p>
                    </div>
                </div>

                <div className="rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current Page</p>
                        <p className="text-2xl font-medium text-zinc-900 mt-1 leading-none">{pagination.page}</p>
                    </div>
                </div>

                <div className="rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Pages</p>
                        <p className="text-2xl font-medium text-zinc-900 mt-1 leading-none">{pagination.totalPages}</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 font-medium">
                    {error}
                </div>
            )}

            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHead>
                        <TableRow className="bg-zinc-50/80 border-b border-zinc-200">
                            <TableHeader>User</TableHeader>
                            <TableHeader>Gender & Age</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Subscription</TableHeader>
                            <TableHeader>Joined</TableHeader>
                            <TableHeader className="text-right">Actions</TableHeader>
                        </TableRow>
                    </TableHead>

                    {loading ? (
                        <tbody>
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-zinc-500 font-medium">
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        </tbody>
                    ) : users.length === 0 ? (
                        <tbody>
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-zinc-500 font-medium">
                                    No users found matching search query.
                                </TableCell>
                            </TableRow>
                        </tbody>
                    ) : (
                        <tbody>
                            {users.map((user) => (
                                <TableRow key={user._id} className="hover:bg-zinc-50/80 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-zinc-600 text-sm">
                                                {user.profilePicture ? (
                                                    <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                                                ) : (
                                                    (user.firstName || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-zinc-900 leading-tight flex items-center gap-1.5">
                                                    {user.firstName} {user.lastName}
                                                    {user.isSuperUser && <Crown className="w-3.5 h-3.5 text-violet-600" aria-label="Super User" />}
                                                    {user.isSuperSubscriber && <Gem className="w-3.5 h-3.5 text-cyan-600" aria-label="Super Subscriber" />}
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-0.5">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="text-sm font-semibold text-zinc-800 capitalize">
                                            {user.gender || 'Not set'}, {user.age || 'N/A'}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {user.isBanned ? (
                                            <span className="inline-flex items-center rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                                                Banned
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                                                Active
                                            </span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${user.subscriptionName === 'Premium' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                                            {user.subscriptionName === 'Premium' && <Star className="w-3 h-3 fill-current" />}
                                            {user.subscriptionName || 'Free'}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <div className="text-xs font-semibold text-zinc-500">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedUser(user)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </tbody>
                    )}
                </Table>

                {users.length > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-5 py-3">
                        <button
                            type="button"
                            onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Prev
                        </button>

                        <div className="text-xs font-semibold text-zinc-600">
                            Page {pagination.page} of {pagination.totalPages}
                        </div>

                        <button
                            type="button"
                            onClick={() => setPage((currentPage) => Math.min(currentPage + 1, pagination.totalPages))}
                            disabled={page >= pagination.totalPages}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onToggleStatus={handleToggleStatus} statusSaving={statusSaving} />
        </div>
    );
};

export default UsersPage;
