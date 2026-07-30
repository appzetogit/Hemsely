import React, { useState } from 'react';

// Single-series bar chart (daily signups) — sequential magnitude, one hue (brand-500),
// thin bars with rounded data-ends, hover tooltip, no legend needed for one series.
const GrowthChart = ({ data }) => {
    const [hovered, setHovered] = useState(null);

    if (!data || data.length === 0) {
        return (
            <div className="flex-1 min-h-[180px] w-full flex flex-col items-center justify-center text-zinc-400">
                <span className="text-[13px] font-medium">No signup activity in this range yet.</span>
            </div>
        );
    }

    const max = Math.max(...data.map((d) => d.count), 1);
    const width = 100 / data.length;

    return (
        <div className="flex-1 min-h-[180px] w-full flex flex-col">
            <div className="relative flex-1 flex items-end gap-1 px-1">
                {data.map((d) => {
                    const heightPct = Math.max((d.count / max) * 100, d.count > 0 ? 6 : 2);
                    const isHovered = hovered?.date === d.date;
                    return (
                        <div
                            key={d.date}
                            className="relative flex-1 flex items-end justify-center h-full"
                            style={{ maxWidth: `${width}%` }}
                            onMouseEnter={() => setHovered(d)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            {isHovered && (
                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-white whitespace-nowrap shadow-lg z-10">
                                    {d.count} signup{d.count === 1 ? '' : 's'}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
                                </div>
                            )}
                            <div
                                className={`w-full rounded-t-md transition-colors cursor-default ${isHovered ? 'bg-brand-600' : 'bg-brand-400'}`}
                                style={{ height: `${heightPct}%`, minHeight: '3px' }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 flex justify-between px-1 text-[10px] font-medium text-zinc-400">
                <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
        </div>
    );
};

export default GrowthChart;
