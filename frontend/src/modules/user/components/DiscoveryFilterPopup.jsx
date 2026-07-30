import React, { useState } from 'react';

const DiscoveryFilterPopup = ({ appliedFilters = { distanceKm: 100 }, onApply, onClose, onUnlockPremium }) => {
    const [interest, setInterest] = useState('Female');
    const [draft, setDraft] = useState(() => ({ distanceKm: appliedFilters?.distanceKm ?? 100 }));
    const [activeTab, setActiveTab] = useState('basic');

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end pointer-events-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Backdrop Button */}
            <button
                type="button"
                aria-label="Close filter modal backdrop"
                className="fixed inset-0 border-0 cursor-default"
                onClick={onClose}
            />

            {/* Modal Sheet */}
            <div className="w-full max-w-[414px] mx-auto bg-white rounded-t-[32px] shadow-2xl p-5 overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh]">
                
                {/* Top Drag Handle */}
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />

                {/* Header Tabs */}
                <div className="w-full h-11 bg-gray-100 p-1 rounded-full flex items-center mb-5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-1.5 rounded-full text-[14px] font-bold transition-all cursor-pointer border-0 ${
                            activeTab === 'basic'
                                ? 'bg-[#733FE0] text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Basic Filter
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('advance')}
                        className={`flex-1 py-1.5 rounded-full text-[14px] font-bold transition-all cursor-pointer border-0 ${
                            activeTab === 'advance'
                                ? 'bg-[#733FE0] text-white shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Advance Filter
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-1 space-y-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {/* Interested In */}
                    <div>
                        <h3 className="text-[15px] font-bold text-gray-900 mb-3">
                            Interested in
                        </h3>
                        <div className="grid grid-cols-3 gap-2.5">
                            {['Male', 'Female', 'Both'].map(type => {
                                const isSelected = interest === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setInterest(type)}
                                        className={`h-[40px] rounded-full text-[13.5px] font-bold transition-all cursor-pointer border ${
                                            isSelected
                                                ? 'bg-[#733FE0] text-white border-[#733FE0] shadow-xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <h3 className="text-[15px] font-bold text-gray-900 mb-3">
                            Location
                        </h3>
                        <div className="h-[48px] bg-gray-50 border border-gray-200/80 rounded-2xl px-4 flex items-center justify-between text-gray-900 cursor-pointer hover:border-purple-300 transition-colors">
                            <div className="flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#733FE0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span className="text-[14px] font-bold">Mumbai, India</span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    </div>

                    {/* Distance Slider */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[15px] font-bold text-gray-900">
                                Maximum Distance
                            </h3>
                            <span className="text-[13.5px] font-extrabold text-[#733FE0] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                                {draft.distanceKm} km
                            </span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="100"
                            value={draft.distanceKm}
                            onChange={(e) => setDraft({ distanceKm: Number(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#733FE0]"
                        />
                    </div>

                    {/* Advanced Section */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-bold text-gray-900">
                                Advanced Matching Criteria
                            </h3>
                            {activeTab === 'advance' && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                                    PRO UNLOCKED
                                </span>
                            )}
                        </div>
                        {[
                            { text: 'Long-term relationship goals', locked: false },
                            { text: 'Religious & cultural beliefs', locked: activeTab !== 'advance' },
                            { text: 'Education level & Career', locked: activeTab !== 'advance' },
                            { text: 'Drinking & Smoking habits', locked: activeTab !== 'advance' }
                        ].map((item) => (
                            <div
                                key={`filter-opt-${item.text}`}
                                className="w-full h-[48px] bg-white rounded-2xl px-4 flex items-center justify-between border border-gray-100 shadow-xs"
                            >
                                <span className={`text-[13.5px] font-semibold ${item.locked ? 'text-gray-400' : 'text-gray-800'}`}>
                                    {item.text}
                                </span>
                                {item.locked ? (
                                    <div className="w-6 h-6 rounded-full bg-purple-50 text-[#733FE0] flex items-center justify-center">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>
                                    </div>
                                ) : (
                                    <span className="text-emerald-500 font-bold text-[14px]">✓</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Button */}
                <div className="pt-3 pb-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'advance') { onUnlockPremium?.(); return; }
                            onApply?.(draft);
                            onClose?.();
                        }}
                        className="w-full h-[46px] rounded-full bg-gradient-to-r from-[#733FE0] to-[#8C52FF] hover:from-[#6232c7] hover:to-[#783ffd] text-white font-extrabold text-[14.5px] shadow-md shadow-purple-200 active:scale-[0.98] transition-all cursor-pointer border-0 tracking-wide uppercase"
                    >
                        {activeTab === 'advance' ? 'Unlock Premium Filters' : 'Apply Filters'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiscoveryFilterPopup;
