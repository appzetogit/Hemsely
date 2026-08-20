import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Eye, Search, Star, UserRound, Crown, Gem, Pencil, ShieldCheck, Ban, Trash2, X, Zap } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';
import { Button } from '../../../shared/components/ui/Button';
import { validateEmailStrict } from '../../../shared/utils/emailValidator';

const PAGE_SIZE = 8;

const DetailRow = ({ label, value }) => (
    <div className="rounded-2xl bg-zinc-50/80 px-4 py-3 transition-colors hover:bg-zinc-100/70">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</div>
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
        city: user.location?.city || '',
        state: user.location?.state || '',
        boostCount: user.boostCount !== undefined ? user.boostCount : 0,
        isPremium: Boolean(user.isPremium),
        isBanned: Boolean(user.isBanned),
    });
    const [saving, setSaving] = useState(false);
    const [emailErr, setEmailErr] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEmailErr('');
        if (formData.email && formData.email.trim()) {
            const val = validateEmailStrict(formData.email.trim());
            if (!val.isValid) {
                setEmailErr(val.message);
                return;
            }
        }
        setSaving(true);
        await onSave(formData);
        setSaving(false);
    };

    return ReactDOM.createPortal(
        <div
            className="fixed top-16 md:left-72 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/35"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[480px] max-h-[82vh] overflow-y-auto rounded-3xl bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-6 relative my-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 mb-4">
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Edit User Profile</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                    if (emailErr) setEmailErr('');
                                }}
                                className={`w-full px-3.5 py-2.5 text-xs rounded-xl outline-none font-medium transition-all shadow-2xs ${emailErr ? 'bg-red-50/60 border border-red-400 text-red-900 focus:ring-2 focus:ring-red-500/20' : 'bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white text-zinc-900 focus:ring-2 focus:ring-zinc-900/10'}`}
                            />
                            {emailErr && <p className="text-[11px] text-red-500 font-semibold mt-1">{emailErr}</p>}
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Phone Number</label>
                            <input
                                type="text"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                required
                                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-3 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 capitalize font-medium text-zinc-900 transition-all shadow-2xs cursor-pointer"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Age</label>
                            <input
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                className="w-full px-3 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Subscription</label>
                            <select
                                value={formData.isPremium ? 'premium' : 'free'}
                                onChange={(e) => setFormData({ ...formData, isPremium: e.target.value === 'premium' })}
                                className="w-full px-3 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 font-medium text-zinc-900 transition-all shadow-2xs cursor-pointer"
                            >
                                <option value="free">Free</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">City</label>
                            <input
                                type="text"
                                placeholder="e.g. Mumbai"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">State</label>
                            <input
                                type="text"
                                placeholder="e.g. Maharashtra"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Profession</label>
                        <input
                            type="text"
                            value={formData.profession}
                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Bio</label>
                        <textarea
                            rows={3}
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium resize-none transition-all shadow-2xs"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Boost Credits</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.boostCount}
                            onChange={(e) => setFormData({ ...formData, boostCount: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all shadow-2xs"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">Account Status</label>
                        <select
                            value={formData.isBanned ? 'banned' : 'active'}
                            onChange={(e) => setFormData({ ...formData, isBanned: e.target.value === 'banned' })}
                            className="w-full px-3 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 font-medium text-zinc-900 transition-all shadow-2xs cursor-pointer"
                        >
                            <option value="active">Active</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 px-4 py-2 text-xs font-semibold cursor-pointer">
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={saving} className="rounded-xl border-0 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm px-4 py-2 text-xs font-semibold cursor-pointer">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

/* ─── User Detail Modal ─── */
const UserDetailModal = ({ user, onClose, onToggleStatus, statusSaving, onEdit, onUnban, onBan, onDelete }) => {
    if (!user) return null;
    const gallery = [user.profilePicture, ...((user.galleryImages || []).map((img) => img.url))].filter(Boolean);

    return ReactDOM.createPortal(
        <div
            className="fixed top-16 md:left-72 left-0 right-0 bottom-0 z-40 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/35"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[82vh] overflow-y-auto rounded-3xl bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-6 md:p-7 relative select-text [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Area */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold text-base shadow-xs shrink-0">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.firstName || 'User'} className="w-full h-full object-cover" />
                            ) : (
                                <UserRound className="w-7 h-7" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 tracking-tight leading-tight">
                                {user.firstName} {user.lastName}
                            </h2>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {(user.isSuperPremium || user.isSuperUser || user.isSuperSubscriber) ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-purple-600 to-violet-600 text-white px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase shadow-xs">
                                        <Crown className="w-3.5 h-3.5 fill-amber-200 text-amber-200" /> Super Premium
                                    </span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${user.subscriptionName === 'Premium' || user.isPremium ? 'bg-amber-50 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                                        {user.isPremium ? 'Premium' : 'Free'}
                                    </span>
                                )}
                                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${user.isBanned ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                    {user.isBanned ? 'Banned' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => onEdit(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        {user.isBanned ? (
                            <button
                                type="button"
                                onClick={() => onUnban(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" /> Unban
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onBan(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                            >
                                <Ban className="w-3.5 h-3.5" /> Ban
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onDelete(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex justify-center rounded-xl bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 hover:text-black transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Admin-assignable status */}
                <div className="mt-2 flex flex-wrap items-center gap-2.5 rounded-2xl bg-zinc-50/90 p-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Admin Control:</span>
                    <button
                        type="button"
                        disabled={statusSaving}
                        onClick={() => onToggleStatus(user, 'isSuperPremium', !(user.isSuperPremium || user.isSuperUser || user.isSuperSubscriber))}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                            (user.isSuperPremium || user.isSuperUser || user.isSuperSubscriber)
                                ? 'bg-gradient-to-r from-amber-500 via-purple-600 to-violet-600 text-white ring-2 ring-purple-400/30 hover:opacity-95'
                                : 'bg-white text-zinc-800 hover:bg-zinc-100 hover:text-black border border-zinc-200'
                        }`}
                    >
                        <Crown className={`w-4 h-4 ${(user.isSuperPremium || user.isSuperUser || user.isSuperSubscriber) ? 'fill-amber-200 text-amber-200 animate-pulse' : 'text-amber-500'}`} />
                        {(user.isSuperPremium || user.isSuperUser || user.isSuperSubscriber) ? 'Remove Super Premium User' : 'Make Super Premium User'}
                    </button>
                </div>

                {/* Detail Grid */}
                <div className="grid grid-cols-2 gap-2.5 mt-3.5">
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
                    <DetailRow label="Boost Balance" value={`${user.boostCount || 0} Boosts`} />
                    <DetailRow label="Premium Expiry Date" value={user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString() : 'N/A'} />
                    <DetailRow label="Join Date" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''} />
                </div>

                {/* Bio Block */}
                <div className="mt-3 rounded-2xl bg-zinc-50/80 p-4">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1.5">Biography</div>
                    <div className="text-xs font-medium text-zinc-800 leading-relaxed">{user.bio || 'No bio provided.'}</div>
                </div>

                {/* Interests Block */}
                <div className="mt-2.5 rounded-2xl bg-zinc-50/80 p-4">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-2">Interests & Hobbies</div>
                    <div className="flex flex-wrap gap-2">
                        {(user.interests || []).length ? (
                            user.interests.map((interest) => (
                                <span key={interest} className="inline-flex items-center rounded-xl bg-white text-zinc-700 px-3 py-1 text-[11px] font-bold shadow-xs">
                                    {interest}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-zinc-400 font-medium">No interests specified.</span>
                        )}
                    </div>
                </div>

                {/* Gallery Block */}
                <div className="mt-2.5 rounded-2xl bg-zinc-50/80 p-4">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-2.5">Gallery Images</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {gallery.length ? (
                            gallery.map((imageUrl, idx) => (
                                <div key={`${idx}-${imageUrl.slice(-40)}`} className="aspect-square rounded-2xl overflow-hidden bg-zinc-100 shadow-xs hover:scale-105 transition-transform">
                                    <img src={imageUrl} alt="User gallery" className="w-full h-full object-cover" />
                                </div>
                            ))
                        ) : (
                            <span className="text-sm col-span-full text-zinc-400 font-medium">No gallery images uploaded.</span>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
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
            if (selectedUser && selectedUser._id === user._id) {
                setSelectedUser(null);
            }
            // Refetch rather than just filtering locally, so the KPI totals stay
            // accurate and deleting the last user on a page doesn't leave the
            // admin stranded with no rows and no pagination controls.
            if (users.length === 1 && page > 1) {
                setPage((p) => p - 1);
            } else {
                fetchUsers();
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
                            <TableHeader>Boost Count</TableHeader>
                            <TableHeader>Joined</TableHeader>
                            <TableHeader className="text-right">Actions</TableHeader>
                        </TableRow>
                    </TableHead>

                    {loading ? (
                        <tbody>
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-zinc-500 font-medium">
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        </tbody>
                    ) : users.length === 0 ? (
                        <tbody>
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-zinc-500 font-medium">
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
                                                    {(user.isSuperPremium || user.isSuperUser || user.isSuperSubscriber) && (
                                                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" aria-label="Super Premium User" />
                                                    )}
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
                                        {(() => {
                                            const isPrem = Boolean(user.isPremium || user.subscriptionName === 'Premium');
                                            if (user.isSuperPremium || user.isSuperUser || user.isSuperSubscriber) {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase bg-gradient-to-r from-amber-500 via-purple-600 to-violet-600 text-white shadow-2xs">
                                                        <Crown className="w-3 h-3 fill-amber-200 text-amber-200" /> Super Premium
                                                    </span>
                                                );
                                            }
                                            if (!isPrem) {
                                                return (
                                                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-zinc-100 text-zinc-700">
                                                        Free
                                                    </span>
                                                );
                                            }
                                            if (user.premiumExpiry) {
                                                const now = new Date();
                                                const expiry = new Date(user.premiumExpiry);
                                                const diffMs = expiry - now;
                                                const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                                if (remainingDays > 0) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs" title={`Expires on: ${expiry.toLocaleDateString()}`}>
                                                            <Star className="w-3.5 h-3.5 fill-current text-amber-600 shrink-0" />
                                                            Premium ({remainingDays}d left)
                                                        </span>
                                                    );
                                                } else {
                                                    return (
                                                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-red-100 text-red-700">
                                                            Expired
                                                        </span>
                                                    );
                                                }
                                            }
                                            return (
                                                <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800">
                                                    <Star className="w-3 h-3 fill-current" /> Premium
                                                </span>
                                            );
                                        })()}
                                    </TableCell>

                                    <TableCell>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold shadow-2xs">
                                            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-600 shrink-0" />
                                            {user.boostCount || 0} {user.boostCount === 1 ? 'Boost' : 'Boosts'}
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
                                                className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                title="Edit User"
                                                onClick={() => setEditingUser(user)}
                                                className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                            {user.isBanned ? (
                                                <button
                                                    type="button"
                                                    title="Unban User"
                                                    onClick={() => handleUnban(user)}
                                                    className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    title="Ban User"
                                                    onClick={() => handleBan(user)}
                                                    className="w-8 h-8 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                title="Delete User"
                                                onClick={() => handleDelete(user)}
                                                className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
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
