import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Heart, TrendingUp, MessageCircle, Crown, RotateCcw } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import GrowthChart from '../components/GrowthChart';

const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, ringColor, actionButton }) => (
    <div className={`${iconBg} rounded-xl shadow-sm border border-white p-4 xl:p-5 flex flex-col justify-between hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between mb-3">
            <p className={`text-sm font-medium tracking-wide ${iconColor}`}>{title}</p>
            <div className="flex items-center gap-2">
                {actionButton}
                <div className={`p-2 rounded-xl bg-white shadow-sm ring-1 ${ringColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-2xl sm:text-3xl font-medium tracking-tight leading-none text-zinc-900">{value}</h3>
        </div>
    </div>
);

const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [growth, setGrowth] = useState([]);
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

    useEffect(() => {
        (async () => {
            const [statsRes, usersRes] = await Promise.all([
                adminApi.get('/admin/dashboard/stats?days=14'),
                adminApi.get('/admin/users?page=1&limit=5'),
            ]);

            if (statsRes.ok && statsRes.data.success) {
                setStats(statsRes.data.stats);
                setGrowth(statsRes.data.growth);
            }
            if (usersRes.ok && usersRes.data.success) {
                setRecentUsers(usersRes.data.users);
            }
            setLoading(false);
        })();
    }, []);

    if (loading) return <PageSpinner />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Welcome back! Here's a snapshot of your platform's current performance and activity.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all border-0 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                        >
                            <RotateCcw className={`w-3 h-3 ${resettingMatches ? 'animate-spin' : ''}`} />
                            Reset
                        </button>
                    }
                />
                <StatCard
                    title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp}
                    iconBg="bg-amber-50" iconColor="text-amber-600" ringColor="ring-amber-100/50"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-zinc-900">User Growth (last 14 days)</h2>
                    </div>
                    <GrowthChart data={growth} />
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
                                            <p className="text-[11px] text-zinc-500 mt-0.5">{user.location?.city || 'Unknown location'}</p>
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
