import React from 'react';
import { Flag, Ban, ChevronRight } from 'lucide-react';

/**
 * Additional options displayed at the bottom of another person's profile:
 * • Report profile
 * • Block profile
 */
const ProfileBottomActions = ({ onReport, onBlock, name = '' }) => {
    return (
        <section
            aria-label="Profile safety options"
            className="w-full mt-8 mb-6 pt-6 border-t border-gray-100"
        >
            <div className="flex items-center gap-2 mb-3.5 px-1">
                <div className="h-[1px] flex-1 bg-gray-200/70" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Safety & Privacy
                </span>
                <div className="h-[1px] flex-1 bg-gray-200/70" />
            </div>

            <div className="space-y-2.5">
                {/* Report profile */}
                <button
                    type="button"
                    onClick={onReport}
                    aria-label={`Report ${name || 'profile'}`}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200/90 rounded-2xl shadow-xs hover:bg-gray-50/80 active:scale-[0.99] transition-all cursor-pointer text-left group"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform shrink-0">
                            <Flag className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                            <span className="block text-[14px] font-semibold text-gray-900 leading-snug">
                                Report profile
                            </span>
                            <span className="block text-[11.5px] text-gray-500 font-normal leading-normal truncate">
                                Report inappropriate behavior, photos, or spam
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                </button>

                {/* Block profile */}
                <button
                    type="button"
                    onClick={onBlock}
                    aria-label={`Block ${name || 'profile'}`}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-red-100 rounded-2xl shadow-xs hover:bg-red-50/40 active:scale-[0.99] transition-all cursor-pointer text-left group"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform shrink-0">
                            <Ban className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                            <span className="block text-[14px] font-semibold text-red-600 leading-snug">
                                Block profile
                            </span>
                            <span className="block text-[11.5px] text-gray-500 font-normal leading-normal truncate">
                                You won't see each other or be able to interact
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-300 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                </button>
            </div>
        </section>
    );
};

export default ProfileBottomActions;
