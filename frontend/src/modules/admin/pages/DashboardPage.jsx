import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Heart, TrendingUp, MessageCircle, Crown, RotateCcw } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import GrowthChart from '../components/GrowthChart';

const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, ringColor, actionButton }) => (
    <div className={`${iconBg} rounded-xl shadow-xs border border-white/80 p-3 flex flex-col justify-between hover:shadow-sm transition-all`}>
        <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-semibold tracking-tight ${iconColor}`}>{title}</p>
            <div className="flex items-center gap-1.5">
                {actionButton}
                <div className={`p-1.5 rounded-lg bg-white shadow-2xs ring-1 ${ringColor} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconColor}`} />
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-none text-zinc-900">{value}</h3>
        </div>
    </div>
);

const CURRENT_YEAR = new Date().getFullYear();

const getDisplayLocation = (loc) => {
    if (!loc) return '';
    if (typeof loc === 'string') return loc.trim();
    const parts = [loc.city, loc.state].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (loc.address) return loc.address;
    return '';
};

const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [chartLoading, setChartLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [growth, setGrowth] = useState([]);
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [availableYears, setAvailableYears] = useState(
        Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i)
    );
    const [recentUsers, setRecentUsers] = useState([]);
    const [resettingMatches, setResettingMatches] = useState(false);

    const handleResetMatches = async () => {
        if (!window.confirm('Are you sure you want to reset all active matches & likes? Users will be able to swipe & match again.')) return;
        setResettingMatches(true);
        const res = await adminApi.delete('/admin/dashboard/reset-matches');
        if (res.ok && res.data.success) {
            setStats((prev) => prev ? { ...prev, activeMatches: 0 } : prev);
            alert('All active matches & likes reset successfully!');
        } else {
            alert(res.data?.message || 'Failed to reset matches.');
        }
        setResettingMatches(false);
    };

    const fetchGrowthData = async (year) => {
        setChartLoading(true);
        const statsRes = await adminApi.get(`/admin/dashboard/stats?year=${year}`);
        if (statsRes.ok && statsRes.data.success) {
            setGrowth(statsRes.data.growth || []);
            if (statsRes.data.selectedYear) setSelectedYear(statsRes.data.selectedYear);
            if (statsRes.data.availableYears?.length) setAvailableYears(statsRes.data.availableYears);
        }
        setChartLoading(false);
    };

    const handleYearChange = (year) => {
        setSelectedYear(year);
        fetchGrowthData(year);
    };

    useEffect(() => {
        (async () => {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    adminApi.get(`/admin/dashboard/stats?year=${selectedYear}`),
                    adminApi.get('/admin/users?page=1&limit=5'),
                ]);

                if (statsRes.ok && statsRes.data.success) {
                    setStats(statsRes.data.stats);
                    setGrowth(statsRes.data.growth || []);
                    if (statsRes.data.selectedYear) setSelectedYear(statsRes.data.selectedYear);
                    if (statsRes.data.availableYears?.length) setAvailableYears(statsRes.data.availableYears);
                } else {
                    setLoadError(statsRes.data?.message || 'Could not load dashboard stats.');
                }
                if (usersRes.ok && usersRes.data.success) {
                    setRecentUsers(usersRes.data.users);
                }
            } catch {
                setLoadError('Could not load dashboard stats. Please try again.');
            }
            setLoading(false);
        })();
    }, []);

    if (loading) return <PageSpinner />;

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <p className="text-sm font-semibold text-zinc-700">{loadError || 'Could not load dashboard stats.'}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-lg bg-[#733FE0] text-white text-xs font-bold cursor-pointer border-0"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Welcome back! Here's a snapshot of your platform's current performance and activity.
                </p>
            </div>

            {/* Stats Grid - All 6 cards in a single row on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                <StatCard
                    title="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users}
                    iconBg="bg-blue-50" iconColor="text-blue-600" ringColor="ring-blue-100/50"
                />
                <StatCard
                    title="New This Week" value={stats.newSignupsWeek.toLocaleString()} icon={UserPlus}
                    iconBg="bg-emerald-50" iconColor="text-emerald-600" ringColor="ring-emerald-100/50"
                />
                <StatCard
                    title="Active Matches" value={stats.activeMatches.toLocaleString()} icon={Heart}
                    iconBg="bg-indigo-50" iconColor="text-indigo-600" ringColor="ring-indigo-100/50"
                    actionButton={
                        <button
                            type="button"
                            onClick={handleResetMatches}
                            disabled={resettingMatches}
                            title="Reset All Active Matches"
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all border-0 cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1"
                        >
                            <RotateCcw className={`w-2.5 h-2.5 ${resettingMatches ? 'animate-spin' : ''}`} />
                            Reset
                        </button>
                    }
                />
                <StatCard
                    title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp}
                    iconBg="bg-amber-50" iconColor="text-amber-600" ringColor="ring-amber-100/50"
                />
                <StatCard
                    title="Total Messages" value={stats.totalMessages.toLocaleString()} icon={MessageCircle}
                    iconBg="bg-violet-50" iconColor="text-violet-600" ringColor="ring-violet-100/50"
                />
                <StatCard
                    title="Premium Users" value={stats.premiumUsers.toLocaleString()} icon={Crown}
                    iconBg="bg-rose-50" iconColor="text-rose-600" ringColor="ring-rose-100/50"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-zinc-200 p-3.5 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                            <h2 className="text-sm font-bold text-zinc-900">User Growth</h2>
                            <p className="text-[11px] text-zinc-500">Monthly signups (Jan – Dec)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="year-select" className="text-xs font-semibold text-zinc-500">Year:</label>
                            <select
                                id="year-select"
                                value={selectedYear}
                                onChange={(e) => handleYearChange(Number(e.target.value))}
                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer shadow-2xs"
                            >
                                {availableYears.map((yr) => (
                                    <option key={yr} value={yr}>
                                        {yr}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {chartLoading ? (
                        <div className="flex-1 min-h-[220px] w-full flex items-center justify-center text-zinc-400">
                            <span className="text-xs font-medium animate-pulse">Loading year data...</span>
                        </div>
                    ) : (
                        <GrowthChart data={growth} />
                    )}
                </div>

                {/* Recent Activity / Users */}
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-3.5 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-zinc-900">Recent Users</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5">
                        {recentUsers.length === 0 ? (
                            <p className="text-[13px] text-zinc-400 font-medium py-6 text-center">No users yet.</p>
                        ) : (
                            recentUsers.map((user) => (
                                <div key={user._id} className="flex items-center justify-between group">
                                    <div className="flex items-center space-x-2.5">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center text-zinc-600 text-xs font-bold uppercase group-hover:bg-zinc-200 transition-colors">
                                            {user.profilePicture ? (
                                                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                (user.firstName || 'U').charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-zinc-900 leading-tight">{user.firstName || 'User'}{user.age ? `, ${user.age}` : ''}</p>
                                            {getDisplayLocation(user.location) ? (
                                                <p className="text-[11px] text-zinc-500 mt-0.5">{getDisplayLocation(user.location)}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                            user.isBanned ? 'bg-danger-50 text-danger-600' :
                                            user.subscriptionName === 'Premium' ? 'bg-zinc-900 text-white' :
                                                'bg-zinc-100 text-zinc-700'
                                        }`}>
                                            {user.isBanned ? 'Banned' : user.subscriptionName}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardPage;
