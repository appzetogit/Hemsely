import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    CreditCard,
    Clock3,
    Settings,
    LogOut,
    Heart,
    Receipt,
    Flag,
    Bell,
    SlidersHorizontal,
    Globe,
    ChevronDown,
    UserCircle,
    ScanFace,
} from 'lucide-react';
import adminApi from '../services/adminApi';

const ADMIN_TOKEN_KEY = 'amora_admin_token';
const ADMIN_SESSION_KEY = 'amora_admin_session:v1';

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: ShieldAlert, label: 'Moderation', path: '/admin/moderation' },
    { icon: ScanFace, label: 'Selfie Verification', path: '/admin/selfie-verification' },
    { icon: Flag, label: 'Reports & Flags', path: '/admin/reports' },
    { icon: CreditCard, label: 'Subscriptions', path: '/admin/subscriptions' },
    { icon: Receipt, label: 'Transactions', path: '/admin/transactions' },
    { icon: Clock3, label: 'Queue Management', path: '/admin/queue-management' },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: SlidersHorizontal, label: 'App Config', path: '/admin/app-config' },
    { icon: UserCircle, label: 'My Profile', path: '/admin/profile' },
];

const WEBSITE_PAGES_ITEMS = [
    { label: 'Privacy Policy', path: '/admin/website-pages/privacy-policy' },
    { label: 'Terms of Services', path: '/admin/website-pages/terms-of-service' },
];

const AdminSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [websitePagesOpen, setWebsitePagesOpen] = useState(location.pathname.startsWith('/admin/website-pages'));

    const handleLogout = async () => {
        try {
            await adminApi.post('/admin/logout', {});
        } catch {
            // Clearing the local session is what actually matters here.
        }
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        navigate('/admin/login', { replace: true });
    };

    return (
        <aside className="w-72 h-screen bg-zinc-900 text-zinc-300 border-r border-white/5 flex flex-col hidden md:flex sticky top-0 z-20">
            {/* Logo & Brand */}
            <div className="h-16 flex flex-shrink-0 items-center justify-center px-4 border-b border-white/5 bg-zinc-900">
                <span className="text-3xl font-extrabold text-white tracking-tight">Hemsely</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-3 py-2.5 rounded-lg transition-colors duration-150 group text-sm ${isActive
                                ? 'bg-brand-500/15 text-white font-medium'
                                : 'text-zinc-300 font-normal hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon
                                strokeWidth={2}
                                className={`w-5 h-5 mr-3 flex-shrink-0 transition-colors ${isActive ? 'text-brand-300' : 'text-zinc-500 group-hover:text-zinc-300'
                                    }`}
                            />
                            {item.label}
                        </NavLink>
                    );
                })}

                <div className="pt-3">
                    <button
                        type="button"
                        onClick={() => setWebsitePagesOpen((prev) => !prev)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-150 group cursor-pointer text-sm border-0 ${websitePagesOpen
                            ? 'bg-white/5 text-white font-medium'
                            : 'bg-transparent text-zinc-300 font-normal hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <span className="flex items-center">
                            <Globe
                                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${websitePagesOpen ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                                    }`}
                            />
                            Website Pages
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${websitePagesOpen ? 'rotate-180 text-white' : 'text-zinc-500'}`} />
                    </button>

                    {websitePagesOpen && (
                        <div className="mt-2 space-y-1 pl-3">
                            {WEBSITE_PAGES_ITEMS.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${isActive
                                            ? 'bg-brand-500/15 text-brand-100 font-medium'
                                            : 'text-zinc-400 font-normal hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </div>
                    )}
                </div>
            </nav>

            {/* Bottom User Area */}
            <div className="p-3 border-t border-white/5 bg-zinc-900">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors group cursor-pointer border-0 bg-transparent"
                >
                    <LogOut className="w-5 h-5 mr-3 text-red-400/80 group-hover:text-red-300" />
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
