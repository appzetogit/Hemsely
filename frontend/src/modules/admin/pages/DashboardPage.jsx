import React, { useEffect, useState } from 'react';
import {
    Users,
    UserPlus,
    Heart,
    TrendingUp,
    MessageCircle,
    Crown,
    RotateCcw,
    Zap,
    Sparkles,
    Ban,
    LifeBuoy,
    Clock,
    Hourglass,
    CheckCircle2,
    CheckCircle
} from 'lucide-react';
import adminApi from '../services/adminApi';
import GrowthChart from '../components/GrowthChart';
import MatchingAlgorithmPieChart from '../components/MatchingAlgorithmPieChart';

const StatSkeleton = () => <div className="h-6 w-14 bg-zinc-200 rounded animate-pulse my-0.5" />;

const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, ringColor, actionButton }) => (
    <div className={`${iconBg} rounded-xl shadow-xs border border-white/80 p-3 flex flex-col justify-between hover:shadow-sm transition-all min-w-0`}>
        <div className="flex items-center justify-between gap-1.5 mb-2">
            <p className={`text-[11px] sm:text-xs font-semibold tracking-tight truncate ${iconColor}`} title={title}>
                {title}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
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

const formatMatchTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

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
    const [recentMatches, setRecentMatches] = useState([]);
    const [algorithmStats, setAlgorithmStats] = useState([]);
    const [resettingMatches, setResettingMatches] = useState(false);

    const handleResetMatches = async () => {
        if (!window.confirm('Are you sure you want to reset all active matches & likes? Users will be able to swipe & match again.')) return;
        const typed = window.prompt('This cannot be undone. Type RESET MATCHES to confirm:');
        if (typed !== 'RESET MATCHES') return;
        setResettingMatches(true);
        const res = await adminApi.delete('/admin/dashboard/reset-matches', { body: JSON.stringify({ confirm: typed }) });
        if (res.ok && res.data.success) {
            setStats((prev) => prev ? { ...prev, activeMatches: 0 } : prev);
            setRecentMatches([]);
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
            if (statsRes.data.algorithmStats) setAlgorithmStats(statsRes.data.algorithmStats);
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
            setLoading(true);
            try {
                const statsRes = await adminApi.get(`/admin/dashboard/stats?year=${selectedYear}`);
                if (statsRes.ok && statsRes.data?.success) {
                    setStats(statsRes.data.stats);
                    setGrowth(statsRes.data.growth || []);
                    if (statsRes.data.recentMatches) setRecentMatches(statsRes.data.recentMatches);
                    if (statsRes.data.algorithmStats) setAlgorithmStats(statsRes.data.algorithmStats);
                    if (statsRes.data.selectedYear) setSelectedYear(statsRes.data.selectedYear);
                    if (statsRes.data.availableYears?.length) setAvailableYears(statsRes.data.availableYears);
                } else {
                    setLoadError(statsRes.data?.message || 'Could not load dashboard stats.');
                }
            } catch (err) {
                setLoadError('Could not load dashboard stats. Please try again.');
            }

            try {
                const usersRes = await adminApi.get('/admin/users?page=1&limit=5');
                if (usersRes.ok && usersRes.data?.success) {
                    setRecentUsers(usersRes.data.users || []);
                }
            } catch (err) {
                // Silently ignore or leave recent users empty if loading users fails
            }
            setLoading(false);
        })();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Welcome back! Here's a snapshot of your platform's current performance and activity.
                </p>
            </div>

            {loadError && !stats && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center rounded-xl bg-red-50 border border-red-100 p-4">
                    <p className="text-sm font-semibold text-zinc-700">{loadError}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-lg bg-[#733FE0] text-white text-xs font-bold cursor-pointer border-0"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Stats Grid - All 14 stats cards in a balanced responsive grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <StatCard
                    title="Total Users"
                    value={loading ? <StatSkeleton /> : (stats?.totalUsers || 0).toLocaleString()}
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    ringColor="ring-blue-100/50"
                />
                <StatCard
                    title="New This Week"
                    value={loading ? <StatSkeleton /> : (stats?.newSignupsWeek || 0).toLocaleString()}
                    icon={UserPlus}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    ringColor="ring-emerald-100/50"
                />
                <StatCard
                    title="Active Matches"
                    value={loading ? <StatSkeleton /> : (stats?.activeMatches || 0).toLocaleString()}
                    icon={Heart}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    ringColor="ring-indigo-100/50"
                    actionButton={
                        <button
                            type="button"
                            onClick={handleResetMatches}
                            disabled={resettingMatches || loading}
                            title="Reset All Active Matches"
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all border-0 cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1"
                        >
                            <RotateCcw className={`w-2.5 h-2.5 ${resettingMatches ? 'animate-spin' : ''}`} />
                            Reset
                        </button>
                    }
                />
                <StatCard
                    title="Total Messages"
                    value={loading ? <StatSkeleton /> : (stats?.totalMessages || 0).toLocaleString()}
                    icon={MessageCircle}
                    iconBg="bg-violet-50"
                    iconColor="text-violet-600"
                    ringColor="ring-violet-100/50"
                />
                <StatCard
                    title="Total Revenue"
                    value={loading ? <StatSkeleton /> : `₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                    icon={TrendingUp}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                    ringColor="ring-amber-100/50"
                />
                <StatCard
                    title="Premium Users"
                    value={loading ? <StatSkeleton /> : (stats?.premiumUsers || 0).toLocaleString()}
                    icon={Crown}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                    ringColor="ring-rose-100/50"
                />
                <StatCard
                    title="Total Boost Buy"
                    value={loading ? <StatSkeleton /> : (stats?.totalBoostBuy || 0).toLocaleString()}
                    icon={Zap}
                    iconBg="bg-orange-50"
                    iconColor="text-orange-600"
                    ringColor="ring-orange-100/50"
                />
                <StatCard
                    title="Total Premium Buy"
                    value={loading ? <StatSkeleton /> : (stats?.totalPremiumBuy || 0).toLocaleString()}
                    icon={Sparkles}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                    ringColor="ring-purple-100/50"
                />
                <StatCard
                    title="Total Ban User"
                    value={loading ? <StatSkeleton /> : (stats?.totalBanUser ?? stats?.totalBannedUsers ?? 0).toLocaleString()}
                    icon={Ban}
                    iconBg="bg-red-50"
                    iconColor="text-red-600"
                    ringColor="ring-red-100/50"
                />
                <StatCard
                    title="Total Tickets"
                    value={loading ? <StatSkeleton /> : (stats?.totalTickets || 0).toLocaleString()}
                    icon={LifeBuoy}
                    iconBg="bg-sky-50"
                    iconColor="text-sky-600"
                    ringColor="ring-sky-100/50"
                />
                <StatCard
                    title="Total Open Ticket"
                    value={loading ? <StatSkeleton /> : (stats?.totalOpenTicket ?? stats?.totalOpenTickets ?? 0).toLocaleString()}
                    icon={Clock}
                    iconBg="bg-yellow-50"
                    iconColor="text-yellow-600"
                    ringColor="ring-yellow-100/50"
                />
                <StatCard
                    title="Total In Progress Ticket"
                    value={loading ? <StatSkeleton /> : (stats?.totalInProgressTicket ?? stats?.totalInProgressTickets ?? 0).toLocaleString()}
                    icon={Hourglass}
                    iconBg="bg-cyan-50"
                    iconColor="text-cyan-600"
                    ringColor="ring-cyan-100/50"
                />
                <StatCard
                    title="Total Resolved Ticket"
                    value={loading ? <StatSkeleton /> : (stats?.totalResolvedTicket ?? stats?.totalResolvedTickets ?? 0).toLocaleString()}
                    icon={CheckCircle2}
                    iconBg="bg-teal-50"
                    iconColor="text-teal-600"
                    ringColor="ring-teal-100/50"
                />
                <StatCard
                    title="Total Closed Ticket"
                    value={loading ? <StatSkeleton /> : (stats?.totalClosedTicket ?? stats?.totalClosedTickets ?? 0).toLocaleString()}
                    icon={CheckCircle}
                    iconBg="bg-zinc-100"
                    iconColor="text-zinc-600"
                    ringColor="ring-zinc-200"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

                {/* Left 2 Columns: User Growth Chart + Recent Matches directly underneath */}
                <div className="lg:col-span-2 space-y-4">
                    {/* User Growth Chart */}
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-3.5 flex flex-col">
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

                    {/* Recent Matches (Last 5 matches) */}
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-3.5 flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center shadow-2xs">
                                    <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-zinc-900">Recent Matches</h2>
                                    <p className="text-[11px] text-zinc-500">Last 5 matches between users</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">
                                {recentMatches.length} Recent
                            </span>
                        </div>

                        {loading ? (
                            <div className="space-y-2.5 py-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : recentMatches.length === 0 ? (
                            <div className="text-center py-7">
                                <div className="w-9 h-9 rounded-full bg-pink-50 text-pink-400 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                                    <Heart className="w-4 h-4" />
                                </div>
                                <p className="text-[13px] text-zinc-600 font-semibold">No matches yet</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">When users swipe right and match, they will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {recentMatches.map((match, idx) => {
                                    const u1 = match.user1 || {};
                                    const u2 = match.user2 || {};
                                    return (
                                        <div
                                            key={match._id || idx}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-zinc-50/90 hover:bg-pink-50/40 border border-zinc-150 hover:border-pink-200 transition-all group"
                                        >
                                            {/* Matched Pair */}
                                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                {/* User 1 */}
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 overflow-hidden flex items-center justify-center text-zinc-600 text-xs font-bold shrink-0 shadow-2xs">
                                                        {u1.profilePicture ? (
                                                            <img src={u1.profilePicture} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (u1.firstName || 'U').charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-[12px] font-bold text-zinc-900 truncate leading-tight">
                                                                {u1.firstName || 'User'}{u1.age ? `, ${u1.age}` : ''}
                                                            </p>
                                                            {u1.isPremium && <Crown className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                                                        </div>
                                                        {getDisplayLocation(u1.location) ? (
                                                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                                                {getDisplayLocation(u1.location)}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {/* Connecting Heart */}
                                                <div className="flex flex-col items-center justify-center shrink-0 px-1">
                                                    <div className="w-6 h-6 rounded-full bg-white shadow-2xs border border-pink-200/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                                                    </div>
                                                </div>

                                                {/* User 2 */}
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 overflow-hidden flex items-center justify-center text-zinc-600 text-xs font-bold shrink-0 shadow-2xs">
                                                        {u2.profilePicture ? (
                                                            <img src={u2.profilePicture} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (u2.firstName || 'U').charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-[12px] font-bold text-zinc-900 truncate leading-tight">
                                                                {u2.firstName || 'User'}{u2.age ? `, ${u2.age}` : ''}
                                                            </p>
                                                            {u2.isPremium && <Crown className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                                                        </div>
                                                        {getDisplayLocation(u2.location) ? (
                                                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                                                {getDisplayLocation(u2.location)}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Time & Badge */}
                                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 sm:pl-2 border-t sm:border-t-0 border-zinc-100 pt-1.5 sm:pt-0">
                                                <span className="text-[10px] text-zinc-400 font-medium">
                                                    {formatMatchTime(match.updatedAt || match.createdAt)}
                                                </span>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    Matched
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right 1 Column: Recent Users + Matching Algorithm Pie Chart */}
                <div className="space-y-4">
                    {/* Recent Users */}
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-3.5 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-zinc-900">Recent Users</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[260px]">
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

                    {/* Matching Algorithm Pie Chart */}
                    <MatchingAlgorithmPieChart data={algorithmStats} loading={loading} />
                </div>

            </div>
        </div>
    );
};

export default DashboardPage;
