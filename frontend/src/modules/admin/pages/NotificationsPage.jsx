import React, { useEffect, useState } from 'react';
import { Bell, Send, Users, Crown, Clock, CheckCircle2, Plus, X } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';

const AUDIENCES = [
    { value: 'all', label: 'All Users', icon: Users, desc: 'Every registered user on the platform' },
    { value: 'premium', label: 'Premium Users', icon: Crown, desc: 'Only users with an active subscription' },
    { value: 'inactive', label: 'Inactive Users', icon: Clock, desc: 'Users who paused their profile' },
];

const defaultForm = { audience: 'all', title: '', body: '' };

const audienceLabel = (n) => {
    if (n.target === 'all') return 'All Users';
    if (n.target === 'segment') return AUDIENCES.find((a) => a.value === n.segment)?.label || n.segment;
    return `${n.targetUsers?.length || 0} selected user(s)`;
};

const NotificationsPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);

    const loadHistory = async () => {
        const { data, ok } = await adminApi.get('/admin/notifications');
        if (ok && data.success) setHistory(data.notifications);
        setLoading(false);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const openModal = () => { setForm(defaultForm); setError(''); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setError(''); };

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.body.trim()) {
            setError('Title and message body are required.');
            return;
        }

        setSending(true);
        const payload = form.audience === 'all'
            ? { title: form.title.trim(), body: form.body.trim(), target: 'all' }
            : { title: form.title.trim(), body: form.body.trim(), target: 'segment', segment: form.audience };

        const { data, ok } = await adminApi.post('/admin/notifications', payload);
        setSending(false);

        if (ok && data.success) {
            setHistory((prev) => [data.notification, ...prev]);
            closeModal();
        } else {
            setError(data.message || 'Could not send notification.');
        }
    };

    const totalSent = history.length;
    const broadcastCount = history.filter((h) => h.target === 'all').length;
    const targetedCount = history.filter((h) => h.target !== 'all').length;

    if (loading) return <PageSpinner />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Push Notifications</h1>
                    <p className="text-sm text-zinc-500 mt-1">Send targeted notifications to users directly from the admin panel.</p>
                </div>
                <button
                    type="button"
                    onClick={openModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    New Notification
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-zinc-100 ring-1 ring-zinc-200 flex items-center justify-center mr-3.5">
                        <Bell className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Sent</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{totalSent}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-blue-50 ring-1 ring-blue-100/50 flex items-center justify-center mr-3.5">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Broadcast</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{broadcastCount}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-amber-50 ring-1 ring-amber-100/50 flex items-center justify-center mr-3.5">
                        <Crown className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Targeted</p>
                        <h3 className="text-xl font-medium text-zinc-900 leading-none">{targetedCount}</h3>
                    </div>
                </div>
            </div>

            {/* Sent History */}
            <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6">
                <h2 className="text-base font-semibold text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Sent History</h2>
                {history.length === 0 ? (
                    <div className="text-center py-10">
                        <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 font-medium">No notifications sent yet.</p>
                        <button type="button" onClick={openModal} className="mt-3 text-sm font-bold text-brand-600 underline underline-offset-2 hover:text-brand-700 bg-transparent border-0 cursor-pointer">
                            Send your first notification
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h._id} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 hover:shadow-sm transition-shadow group">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <CheckCircle2 className="w-5 h-5 text-success-500 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-zinc-900 truncate">{h.title}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{h.body}</p>
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">→ {audienceLabel(h)} ({h.deliveryStats?.recipientCount || 0})</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                                {new Date(h.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Compose Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
                    <button
                        type="button"
                        aria-label="Close modal backdrop"
                        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm border-0 cursor-default"
                        onClick={closeModal}
                    />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
                        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-900">New Notification</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Compose and send to your audience</p>
                                </div>
                            </div>
                            <button type="button" aria-label="Close modal" onClick={closeModal} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors bg-transparent border-0 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSend} className="space-y-5">
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Target Audience</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {AUDIENCES.map(({ value, label, icon: Icon, desc }) => (
                                        <label
                                            key={value}
                                            htmlFor={`audience-${value}`}
                                            className={`flex flex-col gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors ${form.audience === value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-zinc-200 bg-white hover:border-zinc-400'}`}
                                        >
                                            <input type="radio" id={`audience-${value}`} aria-label={label} name="audience" value={value} checked={form.audience === value} onChange={handleChange} className="sr-only" />
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${form.audience === value ? 'text-brand-600' : 'text-zinc-400'}`} />
                                                <span className={`text-xs font-semibold ${form.audience === value ? 'text-brand-700' : 'text-zinc-600'}`}>{label}</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-400 leading-snug">{desc}</p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="notif-title" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Notification Title</label>
                                <input
                                    id="notif-title"
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. New Matches Waiting!"
                                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-zinc-400"
                                />
                            </div>

                            <div>
                                <label htmlFor="notif-body" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Message Body</label>
                                <textarea
                                    id="notif-body"
                                    name="body"
                                    value={form.body}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Write the notification message here..."
                                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-zinc-400 resize-none"
                                />
                            </div>

                            {error && <p className="text-sm font-semibold text-danger-600">{error}</p>}

                            <div className="flex gap-3 pt-2 border-t border-zinc-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                                >
                                    <Send className="w-4 h-4" />
                                    {sending ? 'Sending...' : 'Send Notification'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
