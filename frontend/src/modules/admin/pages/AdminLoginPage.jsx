import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, AlertCircle, Eye, EyeOff } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Input, Label } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

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
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-[420px] rounded-3xl bg-white p-8 shadow-2xl">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mb-4">
                        <Heart className="text-white w-6 h-6 fill-current" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Hemsely Admin</h1>
                    <p className="text-sm text-zinc-500 mt-1.5">Sign in to access the admin panel.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="admin-email">Email</Label>
                        <Input
                            id="admin-email"
                            name="email"
                            type="email"
                            autoComplete="username email"
                            placeholder="Enter admin email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="admin-password">Password</Label>
                        <div className="relative">
                            <Input
                                id="admin-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors p-1"
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-xl bg-danger-50 border border-red-100 px-3.5 py-2.5 text-sm text-danger-600">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                        {loading ? 'Signing in...' : 'Login'}
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default AdminLoginPage;
