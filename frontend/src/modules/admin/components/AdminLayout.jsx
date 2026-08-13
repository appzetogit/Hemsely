import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import adminApi, { clearAdminSession } from '../services/adminApi';
import { Menu, Bell, User, LogOut } from 'lucide-react';

const ADMIN_SESSION_KEY = 'hemsely_admin_session:v1';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [admin, setAdmin] = useState(null);
    const [authCheckError, setAuthCheckError] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const userMenuRef = useRef(null);
    const notifRef = useRef(null);

    // Close the full-screen mobile sidebar overlay whenever the route changes,
    // otherwise it stays open on top of the page the admin just navigated to.
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const verifySession = async () => {
        setCheckingAuth(true);
        setAuthCheckError('');

        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');
        const refreshToken = sessionStorage.getItem('adminRefreshToken') || localStorage.getItem('adminRefreshToken');
        const sessionActive = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);

        if (!token && !refreshToken && !sessionActive) {
            navigate('/admin/login', { replace: true });
            return;
        }

        try {
            const { data, ok, status } = await adminApi.get('/admin/me');
            if (ok && data.success) {
                setAdmin(data.admin);
                setAuthCheckError('');
            } else if (status === 401 || status === 403 || !data?.success) {
                clearAdminSession();
                navigate('/admin/login', { replace: true });
            } else {
                setAuthCheckError('Could not verify your session. Please retry or log in again.');
            }
        } catch {
            setAuthCheckError('Could not verify your session. Please retry or log in again.');
        } finally {
            setCheckingAuth(false);
        }
    };

    useEffect(() => {
        verifySession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    useEffect(() => {
        if (checkingAuth) return;
        adminApi.get('/admin/notifications?limit=5').then(({ data, ok }) => {
            if (ok && data.success) setRecentNotifications(data.notifications);
        });
    }, [checkingAuth]);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await adminApi.post('/admin/logout', {});
        } catch {
            // Clearing the local session is what actually matters here.
        }
        clearAdminSession();
        navigate('/admin/login', { replace: true });
    };

    if (checkingAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50">
                <div className="h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
            </div>
        );
    }

    const initials = admin ? `${admin.firstName?.[0] || ''}${admin.lastName?.[0] || ''}`.toUpperCase() || admin.username?.[0]?.toUpperCase() : 'A';

    return (
        <div className="flex h-screen bg-zinc-50 font-sans">
            {/* Desktop Sidebar */}
            <AdminSidebar />

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-zinc-900/80 flex">
                    <AdminSidebar />
                    <button type="button" aria-label="Close mobile menu" className="flex-1 bg-transparent border-none" onClick={() => setIsMobileMenuOpen(false)} />
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50 relative">

                {/* Top Header */}
                <header className="bg-zinc-900 border-b border-white/5 h-16 flex flex-shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8 z-10">

                    <div className="flex items-center flex-1">
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle mobile menu"
                            className="md:hidden p-2 -ml-2 mr-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
                        >
                            <span className="sr-only">Open sidebar</span>
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="hidden sm:block text-lg font-medium text-white tracking-tight">Admin Panel</h2>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button
                                type="button"
                                aria-label="View notifications"
                                onClick={() => setShowNotifications((prev) => !prev)}
                                className="p-2 text-zinc-400 hover:text-white relative rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <span className="sr-only">View notifications</span>
                                <Bell className="w-5 h-5" />
                                {recentNotifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-brand-400 ring-2 ring-zinc-900" />
                                )}
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-2xl border border-zinc-200 py-2 z-50">
                                    <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                                        Recent Notifications
                                    </div>
                                    {recentNotifications.length === 0 ? (
                                        <p className="px-4 py-4 text-sm text-zinc-400">No notifications sent yet.</p>
                                    ) : (
                                        recentNotifications.map((n) => (
                                            <Link
                                                key={n._id}
                                                to="/admin/notifications"
                                                onClick={() => setShowNotifications(false)}
                                                className="block px-4 py-3 border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                                            >
                                                <p className="text-sm font-semibold text-zinc-900">{n.title}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                                            </Link>
                                        ))
                                    )}
                                    <Link
                                        to="/admin/notifications"
                                        onClick={() => setShowNotifications(false)}
                                        className="block px-4 py-2 text-xs font-semibold text-brand-600 hover:bg-zinc-50 text-center"
                                    >
                                        View all
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* User menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                type="button"
                                aria-label="Open user menu"
                                onClick={() => setShowUserMenu((prev) => !prev)}
                                className="flex items-center focus:outline-none focus:ring-2 focus:ring-white/20 rounded-full"
                            >
                                <span className="sr-only">Open user menu</span>
                                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-200 hover:bg-brand-500/30 hover:text-white transition-colors text-xs font-bold">
                                    {initials || <User className="w-4 h-4" />}
                                </div>
                            </button>
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-2xl border border-zinc-200 py-2 z-50">
                                    <div className="px-4 py-2 border-b border-zinc-100">
                                        <p className="text-sm font-semibold text-zinc-900 truncate">{admin?.firstName ? `${admin.firstName} ${admin.lastName || ''}` : admin?.username}</p>
                                        <p className="text-xs text-zinc-500 truncate">{admin?.email}</p>
                                    </div>
                                    <Link
                                        to="/admin/profile"
                                        onClick={() => setShowUserMenu(false)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                                    >
                                        <User className="w-4 h-4" /> My Profile
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-0 bg-transparent cursor-pointer text-left"
                                    >
                                        <LogOut className="w-4 h-4" /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area Scrollable */}
                <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 relative z-[1] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {authCheckError && (
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                            <span>{authCheckError}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={verifySession}
                                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer border-0 transition-colors"
                                >
                                    Retry
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer border-0 transition-colors"
                                >
                                    Log in again
                                </button>
                            </div>
                        </div>
                    )}
                    <div key={location.pathname} className="page-transition bg-zinc-50 min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
