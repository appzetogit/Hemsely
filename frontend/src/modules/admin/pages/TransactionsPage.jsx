import React, { useEffect, useState } from 'react';
import { IndianRupee, Receipt, CheckCircle2, XCircle, Clock, Filter, Download, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';

const STATUS_FILTERS = ['all', 'pending', 'success', 'failed', 'refunded'];

const STATUS_STYLES = {
    success: { bg: 'bg-success-50 text-success-600', icon: CheckCircle2 },
    pending: { bg: 'bg-amber-100 text-amber-700', icon: Clock },
    failed: { bg: 'bg-danger-50 text-danger-600', icon: XCircle },
    refunded: { bg: 'bg-zinc-100 text-zinc-600', icon: RotateCcw },
};

const StatusBadge = ({ status }) => {
    const { bg, icon: Icon } = STATUS_STYLES[status] || STATUS_STYLES.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${bg}`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
};

const exportCsv = (transactions) => {
    const header = ['Transaction ID', 'User', 'Email', 'Plan', 'Amount', 'Status', 'Date'];
    const rows = transactions.map((t) => [
        t._id,
        `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim(),
        t.user?.email || '',
        t.plan?.name || '',
        t.amount,
        t.status,
        new Date(t.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalTransactions: 0 });
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const query = new URLSearchParams({ page: String(page), limit: '10' });
        if (statusFilter !== 'all') query.set('status', statusFilter);
        if (dateFrom) query.set('startDate', dateFrom);
        if (dateTo) query.set('endDate', dateTo);

        adminApi.get(`/admin/transactions?${query.toString()}`).then(({ data, ok }) => {
            if (ok && data.success) {
                setTransactions(data.transactions);
                setPagination(data.pagination);
            }
            setLoading(false);
        });
    }, [page, statusFilter, dateFrom, dateTo]);

    const resetFilters = () => {
        setStatusFilter('all');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const successCount = transactions.filter((t) => t.status === 'success').length;
    const pendingCount = transactions.filter((t) => t.status === 'pending').length;
    const failedCount = transactions.filter((t) => t.status === 'failed').length;
    const pageRevenue = transactions.filter((t) => t.status === 'success').reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Transaction History</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Read-only log of all subscription payments and their statuses.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-success-50 ring-1 ring-emerald-100/50 flex items-center justify-center mr-3.5">
                        <IndianRupee className="w-5 h-5 text-success-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">This Page Revenue</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">₹{pageRevenue.toLocaleString('en-IN')}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-blue-50 ring-1 ring-blue-100/50 flex items-center justify-center mr-3.5">
                        <Receipt className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Successful</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{successCount}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-amber-50 ring-1 ring-amber-100/50 flex items-center justify-center mr-3.5">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Pending</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{pendingCount}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-red-50 ring-1 ring-red-100/50 flex items-center justify-center mr-3.5">
                        <XCircle className="w-5 h-5 text-danger-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Failed</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{failedCount}</h3>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2 shrink-0 text-zinc-500">
                        <Filter className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
                    </div>

                    <div className="flex flex-col gap-1 min-w-[140px]">
                        <label htmlFor="txn-status-filter" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</label>
                        <select
                            id="txn-status-filter"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 capitalize"
                        >
                            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="date-from" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">From Date</label>
                        <input
                            id="date-from"
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="date-to" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">To Date</label>
                        <input
                            id="date-to"
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                    </div>

                    <div className="flex gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="px-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={() => exportCsv(transactions)}
                            disabled={transactions.length === 0}
                            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-white border border-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                {loading ? (
                    <PageSpinner />
                ) : transactions.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-zinc-500">
                        No transactions match the selected filters.
                    </div>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow hover={false}>
                                <TableHeader>User</TableHeader>
                                <TableHeader>Plan</TableHeader>
                                <TableHeader>Amount</TableHeader>
                                <TableHeader>Gateway</TableHeader>
                                <TableHeader>Date</TableHeader>
                                <TableHeader>Status</TableHeader>
                            </TableRow>
                        </TableHead>
                        <tbody>
                            {transactions.map((txn) => (
                                <TableRow key={txn._id}>
                                    <TableCell>
                                        <div className="text-sm font-semibold text-zinc-900 leading-tight">{txn.user ? `${txn.user.firstName || ''} ${txn.user.lastName || ''}`.trim() || 'User' : 'Deleted user'}</div>
                                        <div className="text-xs text-zinc-500 mt-0.5">{txn.user?.email || txn.user?.phoneNumber}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium text-zinc-700">{txn.plan?.name || '—'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-semibold text-zinc-900">₹{txn.amount.toLocaleString('en-IN')}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium text-zinc-600 capitalize">{txn.gateway}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium text-zinc-600">
                                            {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={txn.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </tbody>
                    </Table>
                )}

                {/* Pagination */}
                {transactions.length > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3.5">
                        <span className="text-xs font-semibold text-zinc-500">
                            {pagination.totalTransactions} transaction{pagination.totalTransactions !== 1 ? 's' : ''} found
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
        </div>
    );
};

export default TransactionsPage;
