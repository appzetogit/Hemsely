import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Flag, ShieldCheck, Ban, Eye, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';
import adminApi from '../services/adminApi';
import { Button } from '../../../shared/components/ui/Button';

const CATEGORY_LABELS = {
    spam: 'Spam',
    fake_profile: 'Fake Profile',
    inappropriate_content: 'Inappropriate Content',
    harassment: 'Harassment',
    scams: 'Scam or Solicitation',
    underage: 'Underage User',
    hate_speech: 'Hate Speech',
    impersonation: 'Impersonation / Stolen Photos',
    other: 'Other',
};

const STATUS_FILTERS = ['all', 'pending', 'reviewed', 'actioned', 'dismissed'];

const STATUS_MAP = {
    pending: { cls: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
    reviewed: { cls: 'bg-blue-100 text-blue-700', icon: CheckCircle2, label: 'Reviewed' },
    actioned: { cls: 'bg-danger-50 text-danger-600', icon: XCircle, label: 'Actioned' },
    dismissed: { cls: 'bg-zinc-100 text-zinc-600', icon: XCircle, label: 'Dismissed' },
};

const StatusBadge = ({ status }) => {
    const { cls, icon: Icon, label } = STATUS_MAP[status] || STATUS_MAP.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${cls}`}>
            <Icon className="w-3 h-3" />
            {label}
        </span>
    );
};

const userName = (u) => u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || 'User' : 'Deleted user';

const ReportDetailModal = ({ report, onClose, onUpdateStatus, updating, updateError }) => {
    const [notes, setNotes] = useState(report?.notes || '');
    if (!report) return null;
    return ReactDOM.createPortal(
        <div
            className="fixed top-16 md:left-72 left-0 right-0 bottom-0 z-40 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/35"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-3xl bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-6 md:p-7 relative select-text [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 pb-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h2 className="text-lg font-bold text-zinc-900">{userName(report.reportedUser)}</h2>
                            <StatusBadge status={report.status} />
                        </div>
                        {report.reportedUser?.isBanned && <p className="text-xs text-red-600 font-semibold">Currently banned</p>}
                    </div>
                    <button
                        type="button"
                        aria-label="Close details"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-2xl bg-zinc-50/80 p-3.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Reported By</div>
                            <div className="text-sm font-semibold text-zinc-900">{userName(report.reporter)}</div>
                        </div>
                        <div className="rounded-2xl bg-zinc-50/80 p-3.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Category</div>
                            <div className="text-sm font-semibold text-zinc-900">{CATEGORY_LABELS[report.category] || report.category}</div>
                        </div>
                        <div className="rounded-2xl bg-zinc-50/80 p-3.5 col-span-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Date Filed</div>
                            <div className="text-sm font-semibold text-zinc-900">
                                {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    {report.reason && (
                        <div className="rounded-2xl bg-zinc-50/80 p-3.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Reporter's Notes</div>
                            <div className="text-xs font-medium text-zinc-800 leading-relaxed">{report.reason}</div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="report-admin-notes" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Admin Notes
                        </label>
                        <textarea
                            id="report-admin-notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            maxLength={1000}
                            placeholder="Internal moderation notes (not shown to users)..."
                            className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium resize-none transition-all shadow-2xs"
                        />
                    </div>
                </div>

                {updateError && (
                    <p className="text-xs font-semibold text-red-600 mt-3">{updateError}</p>
                )}

                <div className="flex flex-wrap gap-2.5 mt-6 pt-4 border-t border-zinc-100">
                    {report.status === 'pending' && (
                        <button
                            type="button"
                            disabled={updating}
                            onClick={() => onUpdateStatus(report._id, 'reviewed', false, notes)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" /> Mark Reviewed
                        </button>
                    )}
                    {report.status !== 'actioned' && !report.reportedUser?.isBanned && (
                        <button
                            type="button"
                            disabled={updating}
                            onClick={() => onUpdateStatus(report._id, 'actioned', true, notes)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <Ban className="w-3.5 h-3.5" /> Ban User
                        </button>
                    )}
                    {report.status !== 'dismissed' && (
                        <button
                            type="button"
                            disabled={updating}
                            onClick={() => onUpdateStatus(report._id, 'dismissed', false, notes)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Dismiss
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-xs font-semibold transition-colors cursor-pointer ml-auto"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalReports: 0 });
    const [counts, setCounts] = useState({ pending: 0, reviewed: 0, actioned: 0, dismissed: 0 });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');

    const loadReports = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const query = new URLSearchParams({ page: String(page), limit: '10' });
            if (statusFilter !== 'all') query.set('status', statusFilter);
            const { data, ok } = await adminApi.get(`/admin/reports?${query.toString()}`);
            if (ok && data.success) {
                setReports(data.reports);
                setPagination(data.pagination);
                if (data.counts) setCounts(data.counts);
            } else {
                setLoadError(data?.message || 'Could not load reports.');
            }
        } catch {
            setLoadError('Could not load reports. Please try again.');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter]);

    const updateStatus = async (id, status, banReportedUser = false, notes) => {
        setUpdating(true);
        setUpdateError('');
        try {
            const { data, ok } = await adminApi.patch(`/admin/reports/${id}/status`, { status, banReportedUser, notes });
            if (ok && data.success) {
                setReports((prev) => prev.map((r) => (r._id === id ? data.report : r)));
                setSelectedReport((prev) => (prev?._id === id ? data.report : prev));
                loadReports();
            } else {
                setUpdateError(data?.message || 'Could not update this report.');
            }
        } catch {
            setUpdateError('Could not update this report. Please try again.');
        }
        setUpdating(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Reports & Flags</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Review user-submitted reports and take moderation actions.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-zinc-100 ring-1 ring-zinc-200 flex items-center justify-center mr-3.5">
                        <Flag className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Reports</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{pagination.totalReports}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-amber-50 ring-1 ring-amber-100/50 flex items-center justify-center mr-3.5">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Pending</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{counts.pending}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-blue-50 ring-1 ring-blue-100/50 flex items-center justify-center mr-3.5">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Reviewed</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{counts.reviewed}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-red-50 ring-1 ring-red-100/50 flex items-center justify-center mr-3.5">
                        <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Actioned</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{counts.actioned}</h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label htmlFor="status-filter" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</label>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-w-[160px] capitalize"
                    >
                        {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {loadError}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl bg-white border border-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-sm font-medium text-zinc-500 flex items-center justify-center gap-2">
                        <div className="h-5 w-5 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
                        Loading reports...
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-zinc-500">No reports match the selected filter.</div>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow hover={false}>
                                <TableHeader>Reported User</TableHeader>
                                <TableHeader>Reported By</TableHeader>
                                <TableHeader>Category</TableHeader>
                                <TableHeader>Date</TableHeader>
                                <TableHeader>Status</TableHeader>
                                <TableHeader>Actions</TableHeader>
                            </TableRow>
                        </TableHead>
                        <tbody>
                            {reports.map((report) => (
                                <TableRow key={report._id}>
                                    <TableCell>
                                        <div className="text-sm font-semibold text-zinc-900 leading-tight">{userName(report.reportedUser)}</div>
                                        {report.reportedUser?.isBanned && <div className="text-xs text-danger-600 mt-0.5">Banned</div>}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium text-zinc-700">{userName(report.reporter)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 text-red-600 border border-red-200/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
                                            <AlertTriangle className="w-3 h-3 text-red-500" />
                                            {CATEGORY_LABELS[report.category] || report.category}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium text-zinc-600">
                                            {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={report.status} />
                                    </TableCell>
                                    <TableCell>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedReport(report)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </tbody>
                    </Table>
                )}

                {/* Pagination */}
                {reports.length > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3.5">
                        <span className="text-xs font-semibold text-zinc-500">
                            {pagination.totalReports} report{pagination.totalReports !== 1 ? 's' : ''} found
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={pagination.page <= 1}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Prev
                            </button>
                            <span className="text-xs font-semibold text-zinc-600">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ReportDetailModal
                key={selectedReport?._id || 'none'}
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                onUpdateStatus={updateStatus}
                updating={updating}
                updateError={updateError}
            />
        </div>
    );
};

export default ReportsPage;
