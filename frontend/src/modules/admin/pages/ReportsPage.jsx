import React, { useEffect, useState } from 'react';
import { Flag, ShieldCheck, Ban, Eye, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import { Button } from '../../../shared/components/ui/Button';

const CATEGORY_LABELS = {
    spam: 'Spam',
    harassment: 'Harassment',
    fake_profile: 'Fake Profile',
    inappropriate_content: 'Inappropriate Content',
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

const ReportDetailModal = ({ report, onClose, onUpdateStatus, updating }) => {
    if (!report) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                aria-label="Close modal backdrop"
                className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm border-0 cursor-default"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4 mb-5">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h2 className="text-lg font-semibold text-zinc-900">{userName(report.reportedUser)}</h2>
                            <StatusBadge status={report.status} />
                        </div>
                        {report.reportedUser?.isBanned && <p className="text-xs text-danger-600 font-semibold">Currently banned</p>}
                    </div>
                    <button
                        type="button"
                        aria-label="Close details"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-700 text-xl font-bold leading-none p-1 rounded hover:bg-zinc-100 bg-transparent border-0 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Reported By</div>
                            <div className="text-sm font-semibold text-zinc-900">{userName(report.reporter)}</div>
                        </div>
                        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Category</div>
                            <div className="text-sm font-semibold text-zinc-900">{CATEGORY_LABELS[report.category] || report.category}</div>
                        </div>
                        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 col-span-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Date Filed</div>
                            <div className="text-sm font-semibold text-zinc-900">
                                {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    {report.reason && (
                        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Reporter's Notes</div>
                            <div className="text-sm font-medium text-zinc-800 leading-relaxed">{report.reason}</div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-zinc-100">
                    {report.status === 'pending' && (
                        <Button variant="secondary" disabled={updating} onClick={() => onUpdateStatus(report._id, 'reviewed')}>
                            <ShieldCheck className="w-4 h-4" />
                            Mark Reviewed
                        </Button>
                    )}
                    {report.status !== 'actioned' && !report.reportedUser?.isBanned && (
                        <Button variant="danger" disabled={updating} onClick={() => onUpdateStatus(report._id, 'actioned', true)}>
                            <Ban className="w-4 h-4" />
                            Ban User
                        </Button>
                    )}
                    {report.status !== 'dismissed' && (
                        <Button variant="outline" disabled={updating} onClick={() => onUpdateStatus(report._id, 'dismissed')}>
                            Dismiss
                        </Button>
                    )}
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

const ReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalReports: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [updating, setUpdating] = useState(false);

    const loadReports = async () => {
        setLoading(true);
        const query = new URLSearchParams({ page: String(page), limit: '10' });
        if (statusFilter !== 'all') query.set('status', statusFilter);
        const { data, ok } = await adminApi.get(`/admin/reports?${query.toString()}`);
        if (ok && data.success) {
            setReports(data.reports);
            setPagination(data.pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter]);

    const updateStatus = async (id, status, banReportedUser = false) => {
        setUpdating(true);
        const { data, ok } = await adminApi.patch(`/admin/reports/${id}/status`, { status, banReportedUser });
        setUpdating(false);
        if (ok && data.success) {
            setReports((prev) => prev.map((r) => (r._id === id ? data.report : r)));
            setSelectedReport((prev) => (prev?._id === id ? data.report : prev));
        }
    };

    const counts = {
        pending: reports.filter((r) => r.status === 'pending').length,
        reviewed: reports.filter((r) => r.status === 'reviewed').length,
        actioned: reports.filter((r) => r.status === 'actioned').length,
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
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">This Page</p>
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

            {/* Table */}
            <div className="rounded-2xl bg-white border border-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                {loading ? (
                    <PageSpinner />
                ) : reports.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-zinc-500">No reports match the selected filter.</div>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
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
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 text-zinc-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
                                            <AlertTriangle className="w-3 h-3" />
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
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                onUpdateStatus={updateStatus}
                updating={updating}
            />
        </div>
    );
};

export default ReportsPage;
