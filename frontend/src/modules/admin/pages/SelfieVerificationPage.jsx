import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, User, Phone, Mail, Briefcase, Heart, MapPin, ExternalLink, Sparkles, Eye } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import { Button } from '../../../shared/components/ui/Button';
import { Textarea, Label } from '../../../shared/components/ui/Input';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

const STATUS_BADGE = {
    pending: { cls: 'bg-amber-100 text-amber-700 border border-amber-200', icon: Clock, label: 'Pending' },
    approved: { cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: CheckCircle2, label: 'Approved' },
    rejected: { cls: 'bg-red-100 text-red-700 border border-red-200', icon: XCircle, label: 'Rejected' },
};

const RejectModal = ({ user, onClose, onConfirm, submitting }) => {
    const [reason, setReason] = useState('');
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm border-0 cursor-default" />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
                <h3 className="text-base font-semibold text-zinc-900 mb-1">Reject Selfie Verification</h3>
                <p className="text-sm text-zinc-500 mb-4">
                    Rejecting verification for <span className="font-bold text-zinc-800">{user.firstName} {user.lastName}</span> ({user.phoneNumber}).
                </p>
                <Label htmlFor="reject-reason">Reason for Rejection</Label>
                <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Selfie photo does not match profile picture" />
                <div className="flex gap-2 mt-4">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button variant="danger" className="flex-1" disabled={submitting} onClick={() => onConfirm(reason)}>
                        {submitting ? 'Rejecting...' : 'Confirm Reject'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const UserDetailModal = ({ user, onClose, onApprove, onReject, submitting }) => {
    if (!user) return null;
    const badge = STATUS_BADGE[user.selfieStatus] || STATUS_BADGE.pending;
    const Icon = badge.icon;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm border-0 cursor-default" />
            <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[82vh] flex flex-col border border-zinc-100 my-auto">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
                            {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-zinc-900 leading-tight">{user.firstName} {user.lastName}</h3>
                                {user.age && <span className="text-xs text-zinc-500 font-medium">({user.age} yrs)</span>}
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                                    <Icon className="w-3 h-3" />
                                    {badge.label}
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-500">{user.phoneNumber} • Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-200/70 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
                    {/* Photos Comparison */}
                    <div>
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">Face Comparison</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Live Selfie */}
                            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-2 flex flex-col items-center">
                                <span className="text-[11px] font-bold text-purple-700 mb-1.5 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Live Selfie
                                </span>
                                <div className="w-full h-44 rounded-lg overflow-hidden bg-zinc-900 shadow-xs">
                                    {user.selfiePhoto ? (
                                        <img src={user.selfiePhoto} alt="Live Selfie" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[11px]">No Selfie Photo</div>
                                    )}
                                </div>
                            </div>

                            {/* Profile Avatar */}
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2 flex flex-col items-center">
                                <span className="text-[11px] font-bold text-zinc-700 mb-1.5 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Profile Photo
                                </span>
                                <div className="w-full h-44 rounded-lg overflow-hidden bg-zinc-900 shadow-xs">
                                    {user.profilePicture ? (
                                        <img src={user.profilePicture} alt="Profile Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[11px]">No Profile Photo</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Attributes Grid */}
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 space-y-3">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">User Profile Details</h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Phone</span>
                                <span className="font-semibold text-zinc-900 truncate block">{user.phoneNumber || 'N/A'}</span>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Email</span>
                                <span className="font-semibold text-zinc-900 truncate block">{user.email || 'Not provided'}</span>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Gender</span>
                                <span className="font-semibold text-zinc-900 capitalize block">{user.gender || 'Not specified'}</span>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Profession</span>
                                <span className="font-semibold text-zinc-900 truncate block">{user.profession || 'Not specified'}</span>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Looking For</span>
                                <span className="font-semibold text-zinc-900 truncate block">{user.relationshipGoal || 'Not specified'}</span>
                            </div>

                            <div>
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Location</span>
                                <span className="font-semibold text-zinc-900 truncate block">
                                    {[user.location?.city, user.location?.state].filter(Boolean).join(', ') || 'Not provided'}
                                </span>
                            </div>
                        </div>

                        {user.bio && (
                            <div className="pt-2 border-t border-zinc-200/60">
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold mb-0.5">Bio</span>
                                <p className="text-xs text-zinc-800 leading-relaxed font-normal">{user.bio}</p>
                            </div>
                        )}

                        {Array.isArray(user.interests) && user.interests.length > 0 && (
                            <div className="pt-2 border-t border-zinc-200/60">
                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold mb-1.5">Interests</span>
                                <div className="flex flex-wrap gap-1">
                                    {user.interests.map((interest, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-semibold">
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between shrink-0">
                    <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                    {user.selfieStatus === 'pending' && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="dangerOutline" disabled={submitting} onClick={() => { onClose(); onReject(user); }}>
                                <X className="w-3.5 h-3.5" /> Reject
                            </Button>
                            <Button size="sm" disabled={submitting} onClick={() => { onClose(); onApprove(user); }}>
                                <ShieldCheck className="w-3.5 h-3.5" /> Approve
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SelfieVerificationPage = () => {
    const [status, setStatus] = useState('pending');
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [rejectingUser, setRejectingUser] = useState(null);
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');

    const loadUsers = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data, ok } = await adminApi.get(`/admin/selfie-verifications?status=${status}&page=${page}&limit=10`);
            if (ok && data.success) {
                setUsers(data.users);
                setPagination(data.pagination);
            } else {
                setLoadError(data?.message || 'Could not load selfie submissions.');
            }
        } catch {
            setLoadError('Could not load selfie submissions. Please try again.');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, page]);

    const handleApprove = async (user) => {
        setSubmitting(true);
        setActionError('');
        try {
            const { data, ok } = await adminApi.patch(`/admin/selfie-verifications/${user._id}`, { approve: true });
            if (ok && data.success) {
                setUsers((prev) => prev.filter((u) => u._id !== user._id));
                setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
            } else {
                setActionError(data?.message || 'Could not approve this selfie.');
            }
        } catch {
            setActionError('Could not approve this selfie. Please try again.');
        }
        setSubmitting(false);
    };

    const handleReject = async (reason) => {
        if (!rejectingUser) return;
        setSubmitting(true);
        setActionError('');
        try {
            const { data, ok } = await adminApi.patch(`/admin/selfie-verifications/${rejectingUser._id}`, { approve: false, rejectionReason: reason });
            if (ok && data.success) {
                setUsers((prev) => prev.filter((u) => u._id !== rejectingUser._id));
                setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
                setRejectingUser(null);
            } else {
                setActionError(data?.message || 'Could not reject this selfie.');
            }
        } catch {
            setActionError('Could not reject this selfie. Please try again.');
        }
        setSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Selfie Verification Queue</h1>
                <p className="text-sm text-zinc-500 mt-1">Review live selfies against user profile pictures with full user details.</p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2">
                {STATUS_FILTERS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => { setStatus(s); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors cursor-pointer border ${
                            status === s ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Submissions</p>
                        <p className="text-2xl font-bold text-zinc-900 mt-1 leading-none">{pagination.total}</p>
                    </div>
                </div>

                <div className="rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current Page</p>
                        <p className="text-2xl font-bold text-zinc-900 mt-1 leading-none">{pagination.page}</p>
                    </div>
                </div>

                <div className="rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Pages</p>
                        <p className="text-2xl font-bold text-zinc-900 mt-1 leading-none">{pagination.totalPages}</p>
                    </div>
                </div>
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {loadError}
                </div>
            )}
            {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {actionError}
                </div>
            )}

            {/* Data Table */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHead>
                        <TableRow hover={false}>
                            <TableHeader>User</TableHeader>
                            <TableHeader>Selfie vs Avatar</TableHeader>
                            <TableHeader>Gender & Age</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Details</TableHeader>
                            <TableHeader>Joined</TableHeader>
                            <TableHeader className="text-right">Actions</TableHeader>
                        </TableRow>
                    </TableHead>

                    {loading ? (
                        <tbody>
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-zinc-500 font-medium">
                                    Loading selfie submissions...
                                </TableCell>
                            </TableRow>
                        </tbody>
                    ) : users.length === 0 ? (
                        <tbody>
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-zinc-500 font-medium">
                                    No {status !== 'all' ? status : ''} selfie submissions found.
                                </TableCell>
                            </TableRow>
                        </tbody>
                    ) : (
                        <tbody>
                            {users.map((user) => {
                                const badge = STATUS_BADGE[user.selfieStatus] || STATUS_BADGE.pending;
                                const Icon = badge.icon;
                                const locationText = [user.location?.city, user.location?.state].filter(Boolean).join(', ');

                                return (
                                    <TableRow key={user._id}>
                                        {/* User Column */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0 overflow-hidden">
                                                    {user.profilePicture ? (
                                                        <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.firstName ? user.firstName[0].toUpperCase() : 'U'
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-zinc-900 text-sm leading-tight">{user.firstName || 'User'} {user.lastName}</p>
                                                    <p className="text-xs text-zinc-500 font-medium">{user.phoneNumber}</p>
                                                    {user.email && <p className="text-[11px] text-zinc-400 truncate max-w-[150px]">{user.email}</p>}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Selfie vs Avatar Column */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {/* Live Selfie */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPreview(user.selfiePhoto)}
                                                    className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-purple-300 shadow-2xs group cursor-pointer shrink-0"
                                                    title="Click to view live selfie"
                                                >
                                                    {user.selfiePhoto ? (
                                                        <img src={user.selfiePhoto} alt="Live Selfie" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-400">No selfie</div>
                                                    )}
                                                    <span className="absolute bottom-0 inset-x-0 bg-purple-700/80 text-[8px] text-white font-bold text-center leading-none py-0.5">Selfie</span>
                                                </button>

                                                {/* Profile Avatar */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPreview(user.profilePicture || user.selfiePhoto)}
                                                    className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-200 shadow-2xs group cursor-pointer shrink-0"
                                                    title="Click to view profile avatar"
                                                >
                                                    {user.profilePicture ? (
                                                        <img src={user.profilePicture} alt="Profile Photo" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-400">No avatar</div>
                                                    )}
                                                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white font-bold text-center leading-none py-0.5">Avatar</span>
                                                </button>
                                            </div>
                                        </TableCell>

                                        {/* Gender & Age Column */}
                                        <TableCell>
                                            <span className="font-semibold text-zinc-800 capitalize text-xs">
                                                {user.gender || 'N/A'}{user.age ? `, ${user.age} yrs` : ''}
                                            </span>
                                        </TableCell>

                                        {/* Status Column */}
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {badge.label}
                                            </span>
                                            {user.selfieStatus === 'rejected' && user.selfieRejectionReason && (
                                                <p className="text-[10px] text-red-600 mt-1 max-w-[130px] truncate" title={user.selfieRejectionReason}>
                                                    "{user.selfieRejectionReason}"
                                                </p>
                                            )}
                                        </TableCell>

                                        {/* Details Column */}
                                        <TableCell>
                                            <div className="text-xs space-y-0.5 max-w-[160px]">
                                                <p className="font-semibold text-zinc-800 truncate" title={user.profession}>{user.profession || 'No profession'}</p>
                                                <p className="text-zinc-500 text-[11px] truncate" title={user.relationshipGoal}>{user.relationshipGoal || 'No goal'}</p>
                                                {locationText && <p className="text-zinc-400 text-[10px] truncate" title={locationText}>{locationText}</p>}
                                            </div>
                                        </TableCell>

                                        {/* Joined Date Column */}
                                        <TableCell>
                                            <span className="text-xs text-zinc-600 font-medium">
                                                {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                                            </span>
                                        </TableCell>

                                        {/* Actions Column */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedUserDetail(user)}
                                                    className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                                                    title="View Full Profile Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                {user.selfieStatus === 'pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={submitting}
                                                            onClick={() => handleApprove(user)}
                                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                                            title="Approve Selfie"
                                                        >
                                                            <ShieldCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={submitting}
                                                            onClick={() => setRejectingUser(user)}
                                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                            title="Reject Selfie"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </tbody>
                    )}
                </Table>
            </div>

            {/* Pagination Controls */}
            {users.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-3.5">
                    <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={pagination.page <= 1} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50">
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <div className="text-sm font-semibold text-zinc-600">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</div>
                    <button type="button" onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))} disabled={pagination.page >= pagination.totalPages} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Photo Zoom Preview Modal */}
            {preview && (
                <div className="fixed inset-0 z-[200] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer" onClick={() => setPreview(null)}>
                    <img src={preview} alt="Selfie preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
                </div>
            )}

            {/* Reject Modal */}
            <RejectModal key={rejectingUser?._id || 'none'} user={rejectingUser} onClose={() => setRejectingUser(null)} onConfirm={handleReject} submitting={submitting} />

            {/* Full User Details Modal */}
            <UserDetailModal
                user={selectedUserDetail}
                onClose={() => setSelectedUserDetail(null)}
                onApprove={handleApprove}
                onReject={(u) => setRejectingUser(u)}
                submitting={submitting}
            />
        </div>
    );
};

export default SelfieVerificationPage;
