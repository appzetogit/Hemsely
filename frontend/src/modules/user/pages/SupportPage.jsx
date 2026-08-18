import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import { devError } from '../../../shared/utils/logger';

const CATEGORY_LABELS = {
    general: 'General Inquiry',
    account: 'Account & Profile',
    billing: 'Subscriptions & Billing',
    bug: 'Technical Bug / Glitch',
    safety: 'Safety & Reporting',
    other: 'Other',
};

const SupportPage = () => {
    const navigate = useNavigate();
    const [supportEmail, setSupportEmail] = useState('support@hemeshly.app');
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(true);

    // Form State
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState('medium');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'

    useEffect(() => {
        fetchSupportConfig();
        fetchMyTickets();
    }, []);

    const fetchSupportConfig = async () => {
        try {
            const { data, ok } = await apiClient.get('/support/config');
            if (ok && data?.supportEmail) {
                setSupportEmail(data.supportEmail);
            }
        } catch (err) {
            devError('Failed to fetch support config:', err);
        }
    };

    const fetchMyTickets = async () => {
        setLoadingTickets(true);
        try {
            const { data, ok } = await apiClient.get('/support/my-tickets');
            if (ok && data?.tickets) {
                setTickets(data.tickets);
            }
        } catch (err) {
            devError('Failed to fetch user tickets:', err);
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleSubmitTicket = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            setErrorMsg('Please enter both subject and message.');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { data, ok } = await apiClient.post('/support/tickets', {
                subject: subject.trim(),
                category,
                priority,
                message: message.trim(),
            });

            if (ok && data?.success) {
                setSuccessMsg('Your support ticket has been submitted! Our team will get back to you soon.');
                setSubject('');
                setMessage('');
                setCategory('general');
                setPriority('medium');
                fetchMyTickets();
                setActiveTab('history');
            } else {
                setErrorMsg(data?.message || 'Failed to submit ticket. Please try again.');
            }
        } catch (err) {
            devError('Ticket submission error:', err);
            setErrorMsg('Failed to submit ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-600 border border-blue-100">OPEN</span>;
            case 'in_progress':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-50 text-[#733FE0] border border-purple-100">IN PROGRESS</span>;
            case 'resolved':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-green-50 text-green-600 border border-green-100">RESOLVED</span>;
            case 'closed':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gray-100 text-gray-600 border border-gray-200">CLOSED</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gray-50 text-gray-500">{status?.toUpperCase()}</span>;
        }
    };

    return (
        <div className="h-screen bg-[#FCFCFC] flex flex-col max-w-[414px] mx-auto overflow-hidden relative font-sans">
            {/* Header */}
            <header className="relative flex items-center justify-between px-4 shrink-0 bg-[#FCFCFC] border-b border-gray-100 shadow-2xs" style={{ height: '52px' }}>
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors border-0 cursor-pointer"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className="font-bold text-[17px] text-black tracking-tight text-center flex-1">
                    Help & Support
                </h1>
                <div className="w-10" />
            </header>

            {/* Main Scrollable Body */}
            <main className="flex-1 overflow-y-auto p-3.5 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Support Email Card */}
                <div className="p-3 rounded-[16px] bg-gradient-to-br from-[#733FE0] to-[#5C2DBA] text-white shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-base shrink-0">
                            ✉️
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-white/80">Support Email</p>
                            <a
                                href={`mailto:${supportEmail}`}
                                className="font-extrabold text-[13.5px] text-white block truncate hover:underline"
                            >
                                {supportEmail}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100/90 p-1 rounded-full">
                    <button
                        type="button"
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all border-0 cursor-pointer ${activeTab === 'new'
                                ? 'bg-white text-[#733FE0] shadow-2xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        Submit Ticket
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all border-0 cursor-pointer ${activeTab === 'history'
                                ? 'bg-white text-[#733FE0] shadow-2xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        My Tickets ({tickets.length})
                    </button>
                </div>

                {/* TAB 1: Submit Ticket Form */}
                {activeTab === 'new' && (
                    <form onSubmit={handleSubmitTicket} className="bg-white p-3.5 rounded-[18px] border border-gray-100 shadow-2xs space-y-3">
                        <h2 className="font-extrabold text-[14.5px] text-gray-900 tracking-tight">Create Support Request</h2>

                        {successMsg && (
                            <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[12px] font-medium">
                                ✅ {successMsg}
                            </div>
                        )}

                        {errorMsg && (
                            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[12px] font-medium">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        {/* Category */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Issue Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50/60 text-[13px] font-medium text-gray-800 focus:outline-none focus:border-[#733FE0]"
                            >
                                <option value="general">General Inquiry</option>
                                <option value="account">Account & Profile</option>
                                <option value="billing">Subscriptions & Billing</option>
                                <option value="bug">Technical Bug / Glitch</option>
                                <option value="safety">Safety & Reporting</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Subject
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Unable to update profile photo"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50/60 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#733FE0]"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Description
                            </label>
                            <textarea
                                required
                                rows={3}
                                placeholder="Please describe the issue you are facing in detail..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50/60 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#733FE0] resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-10 rounded-full bg-[#733FE0] hover:bg-[#602ecc] text-white font-bold text-[13.5px] shadow-xs transition-all border-0 cursor-pointer disabled:opacity-50 active:scale-[0.98] mt-1"
                        >
                            {submitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}
                        </button>
                    </form>
                )}

                {/* TAB 2: Ticket History */}
                {activeTab === 'history' && (
                    <div className="space-y-3">
                        {loadingTickets ? (
                            <div className="py-12 text-center text-gray-400 text-[14px]">
                                Loading your tickets...
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="py-16 text-center bg-white rounded-[20px] border border-gray-100 p-6">
                                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-2xl mx-auto mb-3">
                                    🎫
                                </div>
                                <p className="font-bold text-gray-800 text-[15px]">No Tickets Submitted Yet</p>
                                <p className="text-gray-400 text-[13px] mt-1">
                                    Need help? Click "Submit Ticket" above to reach our support team.
                                </p>
                            </div>
                        ) : (
                            tickets.map((t) => (
                                <div key={t._id} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-2xs space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-extrabold text-[#733FE0] uppercase tracking-wider">
                                            {t.ticketId}
                                        </span>
                                        {getStatusBadge(t.status)}
                                    </div>

                                    <div>
                                        <h3 className="font-extrabold text-[15px] text-gray-900">{t.subject}</h3>
                                        <p className="text-[12.5px] text-gray-500 mt-0.5">
                                            Category: <span className="font-semibold text-gray-700">{CATEGORY_LABELS[t.category] || t.category}</span>
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-[13px] text-gray-700 leading-relaxed">
                                        {t.message}
                                    </div>

                                    {t.adminResponse && (
                                        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-[13px] text-purple-900 leading-relaxed mt-2">
                                            <p className="font-extrabold text-[#733FE0] text-[11.5px] uppercase tracking-wider mb-1 flex items-center gap-1">
                                                💬 Support Response
                                            </p>
                                            <p className="font-medium text-gray-800">{t.adminResponse}</p>
                                            {t.respondedAt && (
                                                <p className="text-[10.5px] text-gray-400 mt-1">
                                                    {new Date(t.respondedAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-[11px] text-gray-400 pt-1 border-t border-gray-50 flex justify-between">
                                        <span>Submitted: {new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SupportPage;
