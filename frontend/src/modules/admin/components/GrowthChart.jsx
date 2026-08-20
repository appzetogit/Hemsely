import React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-xl border border-zinc-800">
                <p className="text-zinc-400 text-[11px] mb-0.5">{label}</p>
                <p className="text-purple-400 text-sm font-bold">
                    {payload[0].value} <span className="text-zinc-300 text-xs font-normal">signup{payload[0].value === 1 ? '' : 's'}</span>
                </p>
            </div>
        );
    }
    return null;
};

const GrowthChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex-1 min-h-[220px] w-full flex flex-col items-center justify-center text-zinc-400">
                <span className="text-sm font-medium">No signup activity in this range yet.</span>
            </div>
        );
    }

    const chartData = data.map((item) => ({
        ...item,
        month: item.month || item.formattedDate || item.date,
    }));

    const chartKey = chartData.map((d) => d.count).join('-') || 'growth-chart';

    return (
        <div className="w-full h-[260px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    key={chartKey}
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                            <stop offset="60%" stopColor="#a855f7" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                        </linearGradient>
                        <filter id="areaGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.3" />
                        </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                        dy={5}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                        allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#userGrowthGradient)"
                        isAnimationActive={true}
                        animationBegin={100}
                        animationDuration={1400}
                        animationEasing="ease-in-out"
                        activeDot={{
                            r: 6,
                            fill: '#7c3aed',
                            stroke: '#ffffff',
                            strokeWidth: 2.5,
                            className: 'animate-pulse drop-shadow-md',
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GrowthChart;

