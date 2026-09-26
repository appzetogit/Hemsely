import React, { useState } from 'react';
import { Ban, X, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import apiClient from '../../../shared/services/apiClient';
import { getCurrentUserId } from '../../../shared/utils/authUtils';

const BlockUserModal = ({
    isOpen,
    onClose,
    targetUserId,
    targetName = 'this user',
    onSuccess,
}) => {
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        if (submitting) return;
        setErrorMessage('');
        onClose();
    };

    const handleConfirmBlock = async () => {
        setErrorMessage('');

        const myId = getCurrentUserId();
        if (!myId) {
            setErrorMessage('You must be logged in to block this profile.');
            return;
        }

        if (!targetUserId) {
            setErrorMessage('Unable to block: target user ID is missing.');
            return;
        }

        setSubmitting(true);
        try {
            const { ok, data } = await apiClient.post(`/users/${myId}/block/${targetUserId}`, {});
            if (ok) {
                if (onSuccess) {
                    onSuccess(targetUserId);
                }
                handleClose();
            } else {
                setErrorMessage(data?.message || 'Failed to block user. Please try again.');
            }
        } catch {
            setErrorMessage('An unexpected error occurred while blocking this profile.');
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
                className="w-full max-w-[390px] bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                        <Ban className="w-6 h-6" />
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

                <div className="mt-4">
                    <h3 className="font-bold text-gray-900 text-[19px] tracking-tight">
                        Block {targetName || 'profile'}?
                    </h3>
                    <p className="text-[13.5px] text-gray-500 mt-2 leading-relaxed">
                        Are you sure you want to block <strong className="text-gray-800 font-semibold">{targetName || 'this user'}</strong>?
                    </p>
                </div>

                <div className="mt-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5 text-[12.5px] text-gray-600">
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>They won't be able to see your profile or message you</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>They will no longer appear in your discovery feed</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>They will not be notified that they were blocked</span>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 text-red-600 text-[12.5px]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <div className="mt-6 flex gap-2.5">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-[14px] transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmBlock}
                        disabled={submitting}
                        className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-[14px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Blocking...</span>
                            </>
                        ) : (
                            'Block'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlockUserModal;
