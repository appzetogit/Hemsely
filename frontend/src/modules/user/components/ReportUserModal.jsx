import React, { useState } from 'react';
import { Flag, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '../../../shared/services/apiClient';
import { getCurrentUserId } from '../../../shared/utils/authUtils';

export const REPORT_REASONS = [
    { id: 'fake_profile', label: 'Fake profile, scam, or bot' },
    { id: 'inappropriate_content', label: 'Inappropriate photos or nudity' },
    { id: 'harassment', label: 'Harassment or abusive behavior' },
    { id: 'scams', label: 'Commercial solicitation or scam' },
    { id: 'underage', label: 'Underage user (under 18)' },
    { id: 'hate_speech', label: 'Hate speech or discrimination' },
    { id: 'impersonation', label: 'Impersonation or stolen photos' },
    { id: 'other', label: 'Other issue' },
];

const ReportUserModal = ({
    isOpen,
    onClose,
    targetUserId,
    targetName = 'this user',
    onSuccess,
    onPromptBlock,
}) => {
    const [selectedCategory, setSelectedCategory] = useState('fake_profile');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        if (submitting) return;
        setSelectedCategory('fake_profile');
        setDetails('');
        setSubmitted(false);
        setErrorMessage('');
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        const myId = getCurrentUserId();
        if (!myId) {
            setErrorMessage('You must be logged in to submit a report.');
            return;
        }

        if (!targetUserId) {
            setErrorMessage('Unable to report: target user ID is missing.');
            return;
        }

        const categoryObj = REPORT_REASONS.find((r) => r.id === selectedCategory);
        const reasonText = selectedCategory === 'other'
            ? details.trim()
            : (details.trim() ? `${categoryObj?.label || selectedCategory}: ${details.trim()}` : (categoryObj?.label || selectedCategory));

        if (selectedCategory === 'other' && !details.trim()) {
            setErrorMessage('Please provide a brief explanation for reporting this profile.');
            return;
        }

        setSubmitting(true);
        try {
            const { ok, data } = await apiClient.post(`/users/${myId}/report/${targetUserId}`, {
                category: selectedCategory,
                reason: reasonText,
            });

            if (ok) {
                setSubmitted(true);
                if (onSuccess) {
                    onSuccess(targetUserId);
                }
            } else {
                setErrorMessage(data?.message || 'Failed to submit report. Please try again.');
            }
        } catch {
            setErrorMessage('An unexpected error occurred while submitting your report.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-[420px] bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <Flag className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-[17px] tracking-tight">
                            Report {targetName || 'profile'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close"
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {submitted ? (
                    /* Success Confirmation State */
                    <div className="py-6 text-center space-y-4">
                        <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">Report Submitted</h4>
                            <p className="text-gray-500 text-[13px] leading-relaxed mt-1 max-w-[320px] mx-auto">
                                Thank you for letting us know. Our safety and moderation team will review this profile promptly.
                            </p>
                        </div>
                        <div className="pt-2 space-y-2">
                            {onPromptBlock && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleClose();
                                        onPromptBlock(targetUserId);
                                    }}
                                    className="w-full py-3 px-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 font-semibold text-[14px] transition-all cursor-pointer"
                                >
                                    Also block {targetName || 'this user'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full py-3 px-4 rounded-xl bg-[#6F3BCE] hover:bg-[#5E2EB8] text-white font-semibold text-[14px] shadow-sm transition-all cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Report Form */
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        <p className="text-[13px] text-gray-500 font-normal">
                            Please select the reason that best describes your report. Your feedback is strictly confidential.
                        </p>

                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 text-red-600 text-[12.5px]">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                            {REPORT_REASONS.map((opt) => {
                                const isSelected = selectedCategory === opt.id;
                                return (
                                    <label
                                        key={opt.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'border-[#6F3BCE] bg-[#F7F2FF]'
                                                : 'border-gray-200 bg-white hover:bg-gray-50/70'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="reportCategory"
                                            value={opt.id}
                                            checked={isSelected}
                                            onChange={() => setSelectedCategory(opt.id)}
                                            className="w-4 h-4 accent-[#6F3BCE] shrink-0"
                                        />
                                        <span className={`text-[13px] ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                            {opt.label}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        {/* Optional or Required Details Textarea */}
                        <div>
                            <label className="block text-[12px] font-semibold text-gray-700 mb-1">
                                Additional details {selectedCategory === 'other' ? '(Required)' : '(Optional)'}
                            </label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder={selectedCategory === 'other' ? 'Please describe what happened...' : 'Provide any additional context for our team...'}
                                rows={3}
                                maxLength={500}
                                required={selectedCategory === 'other'}
                                className="w-full p-3 rounded-xl border border-gray-200 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#6F3BCE] resize-none"
                            />
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={submitting}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-[14px] transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-3 px-4 rounded-xl bg-[#6F3BCE] hover:bg-[#5E2EB8] text-white font-semibold text-[14px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    'Submit Report'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ReportUserModal;
