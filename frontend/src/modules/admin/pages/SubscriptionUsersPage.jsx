import React, { useEffect, useState } from 'react';
import { UserCheck, Star, Search, Clock, ChevronLeft, ChevronRight, Copy, Check, ShieldCheck, Crown } from 'lucide-react';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';

const SubscriptionUsersPage = () => {
    const [subUsers, setSubUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchSubUsers = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const queryParams = new URLSearchParams({
                page: String(page),
                limit: '10',
            });
            if (debouncedSearch) {
                queryParams.append('search', debouncedSearch);
            }

            const { data, ok } = await adminApi.get(`/admin/subscription-users?${queryParams.toString()}`);
            if (ok && data.success) {
                setSubUsers(data.subscriptionUsers || []);
                setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
            } else {
                setLoadError(data?.message || 'Could not load subscription users.');
            }
        } catch (err) {
            console.error('Failed to load subscription users:', err);
            setLoadError('Could not load subscription users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, debouncedSearch]);

    const copyToClipboard = async (text, idKey) => {
        try {
            if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
            await navigator.clipboard.writeText(text);
            setCopiedId(idKey);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            // Clipboard access can fail (non-HTTPS context, permissions, older browsers) -
            // fail quietly rather than show a false "copied" checkmark.
        }
    };

    const activeCount = subUsers.filter((item) => item.isPremium).length;
    const expiredCount = subUsers.filter((item) => item.isExpired).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Subscription Users</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Complete end-to-end tracking of all users who purchased or hold platform subscriptions.
                </p>
            </div>

            {/* Header Toolbar: Search + Summary Chips */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by User Name, Email, Sub ID or Txn ID..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all shadow-2xs font-medium"
                    />
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <UserCheck className="w-4 h-4 text-purple-700" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Total Subscribers</p>
                            <p className="text-sm font-extrabold text-zinc-900 leading-tight mt-0.5">{pagination.total}</p>
                        </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 text-emerald-700 fill-current" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Active (This Page)</p>
                            <p className="text-sm font-extrabold text-emerald-700 leading-tight mt-0.5">{activeCount}</p>
                        </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-red-700" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Expired (This Page)</p>
                            <p className="text-sm font-extrabold text-red-700 leading-tight mt-0.5">{expiredCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {loadError}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
                {loading ? (
                    <PageSpinner />
                ) : subUsers.length === 0 ? (
                    <div className="p-12 text-center text-sm font-medium text-zinc-500">
                        No subscription users found.
                    </div>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow hover={false}>
                                <TableHeader>User</TableHeader>
                                <TableHeader>Subscription ID</TableHeader>
                                <TableHeader>Txn ID & Plan</TableHeader>
                                <TableHeader>Start Date</TableHeader>
                                <TableHeader>Expiry Date</TableHeader>
                                <TableHeader>Remaining Days</TableHeader>
                                <TableHeader>Status</TableHeader>
                            </TableRow>
                        </TableHead>
                        <tbody>
                            {subUsers.map((item) => {
                                const user = item.user || {};
                                const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
                                const userEmail = user.email || user.phoneNumber || 'N/A';
                                const subId = item.subscriptionId || 'N/A';
                                const txnId = item.transactionId || 'N/A';

                                return (
                                    <TableRow key={item._id} className="hover:bg-zinc-50/80 transition-colors">
                                        {/* User Column */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-purple-700 text-sm shadow-2xs">
                                                    {user.profilePicture ? (
                                                        <img src={user.profilePicture} alt={userName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        userName.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-zinc-900 leading-tight flex items-center gap-1">
                                                        {userName}
                                                        {item.isPremium && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" title="Active Premium" />}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 mt-0.5">{userEmail}</div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Subscription ID Column */}
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(subId, `sub-${item._id}`)}
                                                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#703DE2] bg-[#F5EEFF] border border-[#E4D1FF] px-2.5 py-1 rounded-lg hover:bg-[#EDE3FF] transition-colors cursor-pointer"
                                                title="Click to copy Subscription ID"
                                            >
                                                <span>{subId}</span>
                                                {copiedId === `sub-${item._id}` ? (
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-[#703DE2]/60" />
                                                )}
                                            </button>
                                        </TableCell>

                                        {/* Plan & Transaction ID */}
                                        <TableCell>
                                            <div>
                                                <span className="text-xs font-bold text-zinc-900 block">{item.planName}</span>
                                                <span className="text-[11px] font-mono text-zinc-500 block mt-0.5">TXN: {txnId}</span>
                                            </div>
                                        </TableCell>

                                        {/* Start Date */}
                                        <TableCell>
                                            <div className="text-xs font-semibold text-zinc-600">
                                                {item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </div>
                                        </TableCell>

                                        {/* Expiry Date */}
                                        <TableCell>
                                            <div className="text-xs font-semibold text-zinc-900">
                                                {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </div>
                                        </TableCell>

                                        {/* Remaining Days */}
                                        <TableCell>
                                            {item.remainingDays > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                                    <Star className="w-3.5 h-3.5 fill-current text-amber-600 shrink-0" />
                                                    {item.remainingDays} days left
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-red-100 text-red-700">
                                                    Expired
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Status Column */}
                                        <TableCell>
                                            {item.isPremium ? (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md bg-zinc-100 text-zinc-600 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase">
                                                    Expired
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </tbody>
                    </Table>
                )}

                {/* Pagination */}
                {subUsers.length > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3.5">
                        <span className="text-xs font-semibold text-zinc-500">
                            Total {pagination.total} subscriber{pagination.total !== 1 ? 's' : ''} found
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

export default SubscriptionUsersPage;
