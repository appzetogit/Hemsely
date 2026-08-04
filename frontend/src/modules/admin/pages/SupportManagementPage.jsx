import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../services/adminApi';
import { devError } from '../../../shared/utils/logger';
import { LifeBuoy, Search, Filter, MessageSquare, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

const CATEGORY_LABELS = {
    general: 'General Inquiry',
    account: 'Account & Profile',
    billing: 'Subscriptions & Billing',
    bug: 'Technical Bug / Glitch',
    safety: 'Safety & Reporting',
    other: 'Other',
};

const SupportManagementPage = () => {
    const [tickets, setTickets] = useState([]);
    const [counts, setCounts] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedTicket, setSelectedTicket] = useState(null);

    // Modal state for editing/responding
    const [editStatus, setEditStatus] = useState('open');
    const [editPriority, setEditPriority] = useState('medium');
    const [adminResponseInput, setAdminResponseInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const params = { page };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (search.trim()) params.search = search.trim();

            const { data, ok } = await adminApi.get('/admin/tickets', { params });
            if (ok && data?.success) {
                setTickets(data.tickets || []);
                if (data.counts) setCounts(data.counts);
                setTotalPages(data.pages || 1);
            } else {
                setLoadError(data?.message || 'Could not load support tickets.');
            }
        } catch (err) {
            devError('Failed to fetch admin support tickets:', err);
            setLoadError('Could not load support tickets. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search, page]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleOpenTicket = (ticket) => {
        setSelectedTicket(ticket);
        setEditStatus(ticket.status || 'open');
        setEditPriority(ticket.priority || 'medium');
        setAdminResponseInput(ticket.adminResponse || '');
        setSaveError('');
    };

    const handleSaveTicket = async (e) => {
        e.preventDefault();
        if (!selectedTicket) return;

        setSaving(true);
        setSaveError('');
        try {
            const { data, ok } = await adminApi.patch(`/admin/tickets/${selectedTicket._id}`, {
                status: editStatus,
                priority: editPriority,
                adminResponse: adminResponseInput.trim(),
            });

            if (ok && data?.success) {
                setSelectedTicket(null);
                fetchTickets();
            } else {
                setSaveError(data?.message || 'Failed to update ticket');
            }
        } catch (err) {
            devError('Error updating ticket:', err);
            setSaveError('Failed to update ticket. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-100 text-amber-700 border border-amber-200"><AlertCircle className="w-3.5 h-3.5" /> Open</span>;
            case 'in_progress':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-100 text-blue-700 border border-blue-200"><Clock className="w-3.5 h-3.5" /> In Progress</span>;
            case 'resolved':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</span>;
            case 'closed':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-zinc-100 text-zinc-600 border border-zinc-200"><XCircle className="w-3.5 h-3.5" /> Closed</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-zinc-100 text-zinc-600">{status}</span>;
        }
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'urgent':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">Urgent</span>;
            case 'high':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 uppercase tracking-wider">High</span>;
            case 'medium':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">Medium</span>;
            case 'low':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600 uppercase tracking-wider">Low</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600">{priority}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 p-6 space-y-6 text-zinc-900 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
                        <LifeBuoy className="w-7 h-7 text-[#733FE0]" />
                        Support Management
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        View, manage, and respond to support tickets submitted by app users.
                    </p>
                </div>
            </div>

            {/* Stat Cards Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Tickets</span>
                    <span className="text-2xl font-bold text-zinc-900 mt-2">{counts.total}</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Open</span>
                    <span className="text-2xl font-bold text-amber-600 mt-2">{counts.open}</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">In Progress</span>
                    <span className="text-2xl font-bold text-blue-600 mt-2">{counts.inProgress}</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Resolved</span>
                    <span className="text-2xl font-bold text-emerald-600 mt-2">{counts.resolved}</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex flex-col justify-between col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Closed</span>
                    <span className="text-2xl font-bold text-zinc-700 mt-2">{counts.closed}</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white rounded-2xl border border-zinc-200 shadow-sm p-3.5">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by Ticket ID or Subject..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#733FE0] focus:ring-1 focus:ring-[#733FE0]"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="w-full sm:w-48 py-2 px-3 bg-white border border-zinc-300 rounded-lg text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#733FE0]"
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {loadError}
                </div>
            )}

            {/* Tickets Table */}
            <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-700">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            <tr>
                                <th className="px-4 py-3.5">Ticket ID</th>
                                <th className="px-4 py-3.5">User</th>
                                <th className="px-4 py-3.5">Subject & Category</th>
                                <th className="px-4 py-3.5">Status</th>
                                <th className="px-4 py-3.5">Date & Time</th>
                                <th className="px-4 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 font-medium">
                                        Loading support tickets...
                                    </td>
                                </tr>
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 font-medium">
                                        No support tickets found.
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((ticket) => {
                                    const u = ticket.user || {};
                                    const userName = u.firstName || u.name || 'User';
                                    const rawPhoto = u.profilePicture || u.galleryImages?.[0];
                                    const photo = typeof rawPhoto === 'string' ? rawPhoto : rawPhoto?.url;

                                    return (
                                        <tr key={ticket._id} className="hover:bg-zinc-50/80 transition-colors">
                                            <td className="px-4 py-3.5 font-bold text-zinc-900 tracking-wider">
                                                {ticket.ticketId || ticket._id.substring(0, 8)}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {photo ? (
                                                        <img src={photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-200" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-[#733FE0]/10 text-[#733FE0] font-bold flex items-center justify-center text-sm shrink-0 border border-[#733FE0]/20">
                                                            {userName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-zinc-900 truncate text-sm">{userName}</p>
                                                        <p className="text-xs text-zinc-500 truncate">{u.email || u.phoneNumber || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 max-w-xs">
                                                <p className="font-bold text-zinc-900 truncate">{ticket.subject}</p>
                                                <span className="inline-block mt-0.5 text-[10px] font-bold text-[#733FE0] bg-[#733FE0]/10 px-2 py-0.5 rounded border border-[#733FE0]/20">
                                                    {CATEGORY_LABELS[ticket.category] || ticket.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {getStatusBadge(ticket.status)}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <p className="text-xs font-semibold text-zinc-800">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                                <p className="text-[11px] font-medium text-zinc-400 mt-0.5">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenTicket(ticket)}
                                                    className="px-3 py-1.5 rounded-lg bg-[#733FE0]/10 hover:bg-[#733FE0]/20 text-[#733FE0] text-xs font-bold border border-[#733FE0]/30 transition-colors cursor-pointer"
                                                >
                                                    Respond / Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 text-xs font-semibold text-zinc-600">
                        <span>Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Ticket Response Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto border border-zinc-200 m-auto">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                            <div>
                                <span className="text-[11px] font-bold text-[#733FE0] uppercase tracking-wider">
                                    Ticket Details • {selectedTicket.ticketId}
                                </span>
                                <h3 className="text-base font-bold text-zinc-900 mt-0.5">
                                    {selectedTicket.subject}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTicket(null)}
                                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center text-sm transition-colors border-0 cursor-pointer shrink-0"
                            >
                                ✕
                            </button>
                        </div>

                        {/* User Details */}
                        <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                            {selectedTicket.user?.profilePicture ? (
                                <img
                                    src={selectedTicket.user.profilePicture}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[#733FE0]/10 text-[#733FE0] font-bold flex items-center justify-center text-sm shrink-0 border border-[#733FE0]/20">
                                    {(selectedTicket.user?.firstName || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-zinc-900 text-sm truncate">
                                    {selectedTicket.user?.firstName || selectedTicket.user?.name || 'User'}
                                </h4>
                                <p className="text-xs text-zinc-500 truncate mt-0.5">
                                    {[selectedTicket.user?.email, selectedTicket.user?.phoneNumber].filter(Boolean).join(' • ') || 'No contact details'}
                                </p>
                            </div>
                        </div>

                        {/* User Message */}
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                User Message
                            </label>
                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed font-medium">
                                {selectedTicket.message}
                            </div>
                        </div>

                        <form onSubmit={handleSaveTicket} className="space-y-3 pt-2 border-t border-zinc-100">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                        Update Status
                                    </label>
                                    <select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className="w-full py-2 px-3 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#733FE0]"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                        Priority
                                    </label>
                                    <select
                                        value={editPriority}
                                        onChange={(e) => setEditPriority(e.target.value)}
                                        className="w-full py-2 px-3 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#733FE0]"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                    Admin Response
                                </label>
                                <textarea
                                    value={adminResponseInput}
                                    onChange={(e) => setAdminResponseInput(e.target.value)}
                                    rows={4}
                                    placeholder="Write a response for the user..."
                                    maxLength={2000}
                                    className="w-full py-2 px-3 bg-white border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#733FE0] resize-none"
                                />
                            </div>

                            {saveError && (
                                <p className="text-xs font-semibold text-red-600">{saveError}</p>
                            )}

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-2.5 rounded-xl bg-[#733FE0] hover:bg-[#602ecc] text-white font-bold text-xs shadow-xs transition-colors border-0 cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportManagementPage;
