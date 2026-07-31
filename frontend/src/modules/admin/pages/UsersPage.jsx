import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search, Star, UserRound, Crown, Gem, Pencil, ShieldCheck, Ban, Trash2, X } from 'lucide-react';
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

/* ─── Edit User Modal ─── */
const EditUserModal = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        _id: user._id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        gender: user.gender || 'male',
        age: user.age || '',
        profession: user.profession || '',
        bio: user.bio || '',
        isPremium: Boolean(user.isPremium),
        isBanned: Boolean(user.isBanned),
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(formData);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[160] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-[460px] max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-5 relative my-auto border border-zinc-100">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Edit User Profile</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                required
                                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 capitalize font-medium"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Age</label>
                            <input
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Subscription</label>
                            <select
                                value={formData.isPremium ? 'premium' : 'free'}
                                onChange={(e) => setFormData({ ...formData, isPremium: e.target.value === 'premium' })}
                                className="w-full px-2 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                            >
                                <option value="free">Free</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Profession</label>
                        <input
                            type="text"
                            value={formData.profession}
                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Bio</label>
                        <textarea
                            rows={2}
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 resize-none font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Account Status</label>
                        <select
                            value={formData.isBanned ? 'banned' : 'active'}
                            onChange={(e) => setFormData({ ...formData, isBanned: e.target.value === 'banned' })}
                            className="w-full px-2 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:border-purple-600 font-medium"
                        >
                            <option value="active">Active</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
                        <Button type="button" variant="outline" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─── User Detail Modal ─── */
const UserDetailModal = ({ user, onClose, onToggleStatus, statusSaving, onEdit, onUnban, onBan, onDelete }) => {
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
                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${user.subscriptionName === 'Premium' || user.isPremium ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                                    {user.isPremium ? 'Premium' : 'Free'}
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

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        {user.isBanned ? (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onUnban(user)}>
                                <ShieldCheck className="w-3.5 h-3.5" /> Unban
                            </Button>
                        ) : (
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onBan(user)}>
                                <Ban className="w-3.5 h-3.5" /> Ban
                            </Button>
                        )}
                        <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => onDelete(user)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex justify-center rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 hover:text-black transition-colors"
                        >
                            Close
                        </button>
                    </div>
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

/* ─── Main Users Page Component ─── */
const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalUsers: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedUser, setSelectedUser] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [statusSaving, setStatusSaving] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                page: String(page),
                limit: String(PAGE_SIZE),
            });
            if (debouncedSearch) {
                queryParams.append('search', debouncedSearch);
            }

            const { data, ok } = await adminApi.get(`/admin/users?${queryParams.toString()}`);
            if (ok && data.success) {
                setUsers(data.users);
                setPagination(data.pagination);
            } else {
                setError(data.message || 'Failed to load users');
            }
        } catch {
            setError('Could not connect to server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, debouncedSearch]);

    const handleToggleStatus = async (user, fieldName, newValue) => {
        setStatusSaving(true);
        const payload = { [fieldName]: newValue };
        const { data, ok } = await adminApi.patch(`/admin/users/${user._id}/status`, payload);
        setStatusSaving(false);
        if (ok && data.success) {
            setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...data.user } : u)));
            if (selectedUser && selectedUser._id === user._id) {
                setSelectedUser((prev) => ({ ...prev, ...data.user }));
            }
        } else {
            alert(data.message || 'Failed to update status');
        }
    };

    const handleUnban = async (user) => {
        const { data, ok } = await adminApi.patch(`/admin/users/${user._id}/unban`, {});
        if (ok && data.success) {
            const updated = { ...user, isBanned: false, banReason: '' };
            setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
            if (selectedUser && selectedUser._id === user._id) {
                setSelectedUser(updated);
            }
            alert(`${user.firstName} ${user.lastName} has been unbanned.`);
        } else {
            alert(data.message || 'Failed to unban user');
        }
    };

    const handleBan = async (user) => {
        const reason = window.prompt(`Enter ban reason for ${user.firstName} ${user.lastName}:`, 'Banned by admin');
        if (reason === null) return;
        const { data, ok } = await adminApi.patch(`/admin/users/${user._id}/ban`, { reason });
        if (ok && data.success) {
            const updated = { ...user, isBanned: true, banReason: reason };
            setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
            if (selectedUser && selectedUser._id === user._id) {
                setSelectedUser(updated);
            }
            alert(`${user.firstName} ${user.lastName} has been banned.`);
        } else {
            alert(data.message || 'Failed to ban user');
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Are you sure you want to delete user ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
            return;
        }
        const { data, ok } = await adminApi.delete(`/admin/users/${user._id}`);
        if (ok && data.success) {
            setUsers((prev) => prev.filter((u) => u._id !== user._id));
            if (selectedUser && selectedUser._id === user._id) {
                setSelectedUser(null);
            }
            alert(`User ${user.firstName} ${user.lastName} deleted successfully.`);
        } else {
            alert(data.message || 'Failed to delete user');
        }
    };

    const handleSaveEdit = async (formData) => {
        const { data, ok } = await adminApi.put(`/admin/users/${formData._id}`, formData);
        if (ok && data.success) {
            const updated = { ...formData, ...data.user, subscriptionName: formData.isPremium ? 'Premium' : 'Free' };
            setUsers((prev) => prev.map((u) => (u._id === formData._id ? updated : u)));
            if (selectedUser && selectedUser._id === formData._id) {
                setSelectedUser(updated);
            }
            setEditingUser(null);
            alert('User profile updated successfully.');
        } else {
            alert(data.message || 'Failed to update user profile');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Users Management</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Browse all platform users, update profiles, moderate accounts, or manage subscriptions.
                </p>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email or phone..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <TableRow hover={false}>
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
                                                <div className="text-xs text-zinc-500 mt-0.5">{user.email || user.phoneNumber}</div>
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
                                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${user.subscriptionName === 'Premium' || user.isPremium ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                                            {(user.subscriptionName === 'Premium' || user.isPremium) && <Star className="w-3 h-3 fill-current" />}
                                            {user.isPremium ? 'Premium' : 'Free'}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <div className="text-xs font-semibold text-zinc-500">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                title="View Details"
                                                onClick={() => setSelectedUser(user)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View
                                            </button>

                                            <button
                                                type="button"
                                                title="Edit User"
                                                onClick={() => setEditingUser(user)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Edit
                                            </button>

                                            {user.isBanned ? (
                                                <button
                                                    type="button"
                                                    title="Unban User"
                                                    onClick={() => handleUnban(user)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Unban
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    title="Ban User"
                                                    onClick={() => handleBan(user)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors shadow-sm"
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                    Ban
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                title="Delete User"
                                                onClick={() => handleDelete(user)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </div>
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

            <UserDetailModal
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onToggleStatus={handleToggleStatus}
                statusSaving={statusSaving}
                onEdit={(user) => setEditingUser(user)}
                onUnban={handleUnban}
                onBan={handleBan}
                onDelete={handleDelete}
            />

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
};

export default UsersPage;
