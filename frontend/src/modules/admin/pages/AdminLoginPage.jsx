import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, AlertCircle, Eye, EyeOff, Mail, Lock, ShieldCheck } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Input, Label } from '../../../shared/components/ui/Input';

const ADMIN_SESSION_KEY = 'hemsely_admin_session:v1';

function AdminLoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        const form = event.currentTarget;
        const emailEl = form.elements['admin-email'] || form.elements['email'];
        const passwordEl = form.elements['admin-password'] || form.elements['password'];

        const normalizedEmail = (email || emailEl?.value || '').trim().toLowerCase();
        const normalizedPassword = (password || passwordEl?.value || '').trim();

        if (!normalizedEmail || !normalizedPassword) {
            setError('Email and password are required.');
            return;
        }

        setLoading(true);
        try {
            const { data, ok } = await adminApi.post('/admin/login', {
                email: normalizedEmail,
                password: normalizedPassword,
            });

            if (!ok) {
                throw new Error(data?.message || 'Invalid admin credentials.');
            }
            if (!data?.token) {
                throw new Error('Login succeeded but no session token was returned.');
            }

            if (data.token) {
                sessionStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminToken', data.token);
            }
            if (data.refreshToken) {
                sessionStorage.setItem('adminRefreshToken', data.refreshToken);
                localStorage.setItem('adminRefreshToken', data.refreshToken);
            }
            sessionStorage.setItem(ADMIN_SESSION_KEY, 'active');
            localStorage.setItem(ADMIN_SESSION_KEY, 'active');
            navigate('/admin', { replace: true });
        } catch (submitError) {
            setError(submitError.message || 'Invalid admin credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#0C0F17] p-4 sm:p-6 overflow-hidden select-none">
            {/* Ambient Background Glows */}
            <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[450px] bg-gradient-to-b from-brand-600/30 via-brand-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
            <div className="absolute -bottom-[200px] -right-[100px] w-[450px] h-[450px] bg-brand-700/15 blur-[120px] pointer-events-none rounded-full" />
            <div className="absolute top-1/3 -left-[150px] w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

            {/* Subtle Tech Grid Texture & Decorative Orbit Rings */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0f_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,#000_60%,transparent_100%)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full border border-white/[0.03] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/[0.02] pointer-events-none" />

            {/* Login Card Container */}
            <div className="relative w-full max-w-[430px] rounded-3xl bg-white/[0.98] backdrop-blur-xl p-8 sm:p-10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7),0_0_40px_rgba(111,59,206,0.12)] border border-white/40 z-10 transition-all">
                
                {/* Header with Badge & Logo */}
                <div className="flex flex-col items-center text-center mb-7">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold uppercase tracking-wider shadow-2xs mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600"></span>
                        </span>
                        Admin Portal
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 ring-4 ring-brand-100/80 mb-3">
                        <Heart className="text-white w-7 h-7 fill-current" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">Hemsely Admin</h1>
                    <p className="text-sm text-zinc-500 mt-1">Sign in to access the administration panel</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="admin-email" className="text-zinc-600 font-semibold text-xs tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-zinc-400" />
                            EMAIL ADDRESS
                        </Label>
                        <div className="relative">
                            <Input
                                id="admin-email"
                                name="email"
                                type="email"
                                autoComplete="username email"
                                placeholder="Enter admin email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="h-11 rounded-xl border border-zinc-200 bg-zinc-50/70 focus:bg-white text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label htmlFor="admin-password" className="text-zinc-600 font-semibold text-xs tracking-wider mb-0 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                                PASSWORD
                            </Label>
                        </div>
                        <div className="relative">
                            <Input
                                id="admin-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="h-11 pr-11 rounded-xl border border-zinc-200 bg-zinc-50/70 focus:bg-white text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors p-1"
                                title={showPassword ? 'Hide password' : 'Show password'}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200/80 px-3.5 py-2.5 text-xs sm:text-sm text-red-700 font-medium">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-white font-semibold text-sm shadow-md shadow-brand-500/30 hover:shadow-lg hover:shadow-brand-500/40 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <span>Sign In to Dashboard</span>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-xs text-zinc-400 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>End-to-End Encrypted Session</span>
                </div>
            </div>

            {/* Footer copyright */}
            <div className="relative z-10 mt-6 text-center text-xs text-zinc-500 font-medium tracking-wide">
                &copy; {new Date().getFullYear()} Hemsely Administration &bull; All rights reserved.
            </div>
        </div>
    );
}

export default AdminLoginPage;
