import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import { Button } from '../../../shared/components/ui/Button';
import { Textarea, Label } from '../../../shared/components/ui/Input';

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

const STATUS_BADGE = {
    pending: { cls: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
    approved: { cls: 'bg-success-50 text-success-600', icon: CheckCircle2, label: 'Approved' },
    rejected: { cls: 'bg-danger-50 text-danger-600', icon: XCircle, label: 'Rejected' },
};

const RejectModal = ({ user, onClose, onConfirm, submitting }) => {
    const [reason, setReason] = useState('');
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm border-0 cursor-default" />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
                <h3 className="text-base font-semibold text-zinc-900 mb-1">Reject selfie</h3>
                <p className="text-sm text-zinc-500 mb-4">{user.firstName || 'This user'}'s selfie will be marked as rejected.</p>
                <Label htmlFor="reject-reason">Reason (shown to the user)</Label>
                <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Face not clearly visible" />
                <div className="flex gap-2 mt-4">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button variant="danger" className="flex-1" disabled={submitting} onClick={() => onConfirm(reason)}>
                        {submitting ? 'Rejecting...' : 'Reject'}
                    </Button>
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
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        const { data, ok } = await adminApi.get(`/admin/selfie-verifications?status=${status}&page=${page}&limit=10`);
        if (ok && data.success) {
            setUsers(data.users);
            setPagination(data.pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, page]);

    const handleApprove = async (user) => {
        setSubmitting(true);
        const { data, ok } = await adminApi.patch(`/admin/selfie-verifications/${user._id}`, { approve: true });
        setSubmitting(false);
        if (ok && data.success) {
            setUsers((prev) => prev.filter((u) => u._id !== user._id));
        }
    };

    const handleReject = async (reason) => {
        if (!rejectingUser) return;
        setSubmitting(true);
        const { data, ok } = await adminApi.patch(`/admin/selfie-verifications/${rejectingUser._id}`, { approve: false, rejectionReason: reason });
        setSubmitting(false);
        if (ok && data.success) {
            setUsers((prev) => prev.filter((u) => u._id !== rejectingUser._id));
            setRejectingUser(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Selfie Verification</h1>
                <p className="text-sm text-zinc-500 mt-1">Manually review selfies submitted for profile verification.</p>
            </div>

            <div className="flex gap-2">
                {STATUS_FILTERS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => { setStatus(s); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors cursor-pointer border ${
                            status === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {loading ? (
                <PageSpinner />
            ) : users.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-zinc-500 font-medium">
                    No {status !== 'all' ? status : ''} selfie submissions.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user) => {
                        const badge = STATUS_BADGE[user.selfieStatus] || STATUS_BADGE.pending;
                        const Icon = badge.icon;
                        return (
                            <div key={user._id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setPreview(user.selfiePhoto)}
                                    className="w-full aspect-square bg-zinc-100 border-0 p-0 cursor-pointer block"
                                >
                                    {user.selfiePhoto && <img src={user.selfiePhoto} alt="Selfie" className="w-full h-full object-cover" />}
                                </button>
                                <div className="p-4">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="text-sm font-bold text-zinc-900 truncate">{user.firstName || 'User'} {user.lastName}</p>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}>
                                            <Icon className="w-3 h-3" />
                                            {badge.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mb-3">{user.phoneNumber}</p>
                                    {user.selfieStatus === 'pending' ? (
                                        <div className="flex gap-2">
                                            <Button size="sm" className="flex-1" disabled={submitting} onClick={() => handleApprove(user)}>
                                                <ShieldCheck className="w-3.5 h-3.5" /> Approve
                                            </Button>
                                            <Button size="sm" variant="dangerOutline" className="flex-1" disabled={submitting} onClick={() => setRejectingUser(user)}>
                                                <X className="w-3.5 h-3.5" /> Reject
                                            </Button>
                                        </div>
                                    ) : user.selfieStatus === 'rejected' && user.selfieRejectionReason ? (
                                        <p className="text-xs text-danger-600 italic">"{user.selfieRejectionReason}"</p>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {users.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-white shadow-sm border border-zinc-200 px-5 py-3.5">
                    <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={pagination.page <= 1} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50">
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <div className="text-sm font-semibold text-zinc-600">Page {pagination.page} of {pagination.totalPages}</div>
                    <button type="button" onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))} disabled={pagination.page >= pagination.totalPages} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {preview && (
                <div className="fixed inset-0 z-[200] bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setPreview(null)}>
                    <img src={preview} alt="Selfie preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
                </div>
            )}

            <RejectModal user={rejectingUser} onClose={() => setRejectingUser(null)} onConfirm={handleReject} submitting={submitting} />
        </div>
    );
};

export default SelfieVerificationPage;
