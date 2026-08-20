import React, { useState } from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip
} from 'recharts';
import { Cpu, Sparkles } from 'lucide-react';

const DEFAULT_ALGORITHMS = [
    { name: 'Location Proximity', value: 22, percentage: 22, color: '#3b82f6', description: 'Nearby GPS distance & same city matching' },
    { name: 'Activity & Time Spent', value: 20, percentage: 20, color: '#8b5cf6', description: 'Active session length & daily engagement' },
    { name: 'Mutual Interests', value: 14, percentage: 14, color: '#ec4899', description: 'Shared hobbies, passions & lifestyle tags' },
    { name: 'Profile Boost (1.5x)', value: 10, percentage: 10, color: '#f59e0b', description: 'Active 30-minute top spotlight boost' },
    { name: 'Premium & VIP Tier', value: 10, percentage: 10, color: '#a855f7', description: 'Premium & Super User discovery priority' },
    { name: 'Verified Profile Badges', value: 8, percentage: 8, color: '#06b6d4', description: 'AWS Selfie Verified trust & ranking boost' },
    { name: 'Relationship Goals', value: 6, percentage: 6, color: '#f43f5e', description: 'Compatible relationship intent (Long-term, Marriage, etc.)' },
    { name: 'Age Compatibility', value: 5, percentage: 5, color: '#eab308', description: 'Optimal age preference & gap range' },
    { name: 'Real-time Online', value: 5, percentage: 5, color: '#10b981', description: 'Live presence & active socket matching' },
];

const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="rounded-xl bg-zinc-900/95 backdrop-blur-md px-3.5 py-2.5 text-xs text-white shadow-2xl border border-zinc-700/60 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-100 font-bold text-xs">{item.name}</span>
                </div>
                <div className="flex items-baseline gap-1.5 my-0.5">
                    <span className="text-base font-extrabold" style={{ color: item.color }}>
                        {item.percentage ?? item.value}%
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">match weight contribution</span>
                </div>
                {item.description && (
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-[210px] leading-tight font-normal border-t border-zinc-800 pt-1">
                        {item.description}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const MatchingAlgorithmPieChart = ({ data, loading }) => {
    const [activeIndex, setActiveIndex] = useState(null);
    const chartData = Array.isArray(data) && data.length > 0 ? data : DEFAULT_ALGORITHMS;

    // Find top contributing factor or active hovered factor
    const topFactor = chartData.reduce(
        (prev, curr) => ((curr.percentage || curr.value) > (prev.percentage || prev.value) ? curr : prev),
        chartData[0]
    );
    const displayFactor = activeIndex !== null && chartData[activeIndex] ? chartData[activeIndex] : topFactor;
    const pieKey = chartData.map((d) => d.value).join('-') || 'algorithm-pie';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-3.5 flex flex-col justify-between transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shadow-2xs">
                        <Cpu className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-zinc-900 leading-tight">Matching Algorithm Breakdown</h2>
                        <p className="text-[11px] text-zinc-500">All 9 core matching & ranking factors</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs">
                    <Sparkles className="w-3 h-3 text-purple-600 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>9 Factors</span>
                </div>
            </div>

            {/* Chart Area */}
            {loading ? (
                <div className="h-[180px] flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                </div>
            ) : (
                <div className="relative w-full h-[180px] flex items-center justify-center my-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart key={pieKey}>
                            <Tooltip content={<CustomPieTooltip />} />
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={72}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                isAnimationActive={true}
                                animationBegin={100}
                                animationDuration={1200}
                                animationEasing="ease-out"
                                onMouseEnter={(_, idx) => setActiveIndex(idx)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                {chartData.map((entry, index) => {
                                    const isSelected = activeIndex === index;
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            className="transition-all duration-300 cursor-pointer outline-none"
                                            style={{
                                                filter: isSelected
                                                    ? `drop-shadow(0px 0px 6px ${entry.color}88)`
                                                    : 'none',
                                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                transformOrigin: 'center center',
                                                transition: 'transform 0.25s ease, filter 0.25s ease',
                                            }}
                                        />
                                    );
                                })}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Animated Highlight */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center transition-all duration-300">
                        <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">
                            {activeIndex !== null ? 'Selected' : 'Top Factor'}
                        </span>
                        <span className="text-xs font-bold text-zinc-900 max-w-[85px] truncate leading-tight mt-0.5 transition-colors">
                            {displayFactor?.name?.split(' ')[0] || 'Proximity'}
                        </span>
                        <span
                            className="text-[11px] font-extrabold transition-all duration-300 scale-105"
                            style={{ color: displayFactor?.color || '#7c3aed' }}
                        >
                            {displayFactor?.percentage ?? displayFactor?.value}%
                        </span>
                    </div>
                </div>
            )}

            {/* Legend / Breakdown List showing all 9 factors */}
            <div className="space-y-1 pt-2 border-t border-zinc-100">
                {chartData.map((item, idx) => {
                    const pct = item.percentage ?? item.value ?? 0;
                    const isActive = activeIndex === idx;
                    return (
                        <div
                            key={idx}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onMouseLeave={() => setActiveIndex(null)}
                            className={`flex items-center justify-between text-xs px-1.5 py-0.5 rounded-lg transition-all duration-200 cursor-pointer ${
                                isActive ? 'bg-zinc-100/90 scale-[1.01] shadow-2xs' : 'hover:bg-zinc-50/80'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0 shadow-2xs transition-transform duration-300"
                                    style={{
                                        backgroundColor: item.color,
                                        transform: isActive ? 'scale(1.4)' : 'scale(1)',
                                    }}
                                />
                                <span
                                    className={`text-[11px] truncate transition-colors ${
                                        isActive ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'
                                    }`}
                                    title={item.description || item.name}
                                >
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-10 h-1 bg-zinc-100 rounded-full overflow-hidden hidden sm:block">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: item.color }}
                                    />
                                </div>
                                <span
                                    className={`text-[11px] w-7 text-right transition-colors ${
                                        isActive ? 'font-extrabold text-zinc-900' : 'font-bold text-zinc-800'
                                    }`}
                                >
                                    {pct}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MatchingAlgorithmPieChart;
