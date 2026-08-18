import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Save, Mail } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Input, Label } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { validateEmailStrict } from '../../../shared/utils/emailValidator';

const PasswordInput = ({ label, name, placeholder, value, onChange, isVisible, onToggleShow }) => (
    <div>
        <Label htmlFor={`pw-${name}`}>{label}</Label>
        <div className="relative">
            <Input
                id={`pw-${name}`}
                type={isVisible ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="pr-11"
            />
            <button
                type="button"
                onClick={onToggleShow}
                aria-label={`Toggle ${label} visibility`}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 bg-transparent border-0 cursor-pointer"
            >
                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    </div>
);

const AdminProfilePage = () => {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', role: '', username: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

    const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
    const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwMsg, setPwMsg] = useState({ text: '', type: '' });

    const [supportEmail, setSupportEmail] = useState('');
    const [supportSaving, setSupportSaving] = useState(false);
    const [supportMsg, setSupportMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        (async () => {
            try {
                const { data, ok } = await adminApi.get('/admin/me');
                if (ok && data.success) {
                    const a = data.admin;
                    setProfile({
                        firstName: a.firstName || '',
                        lastName: a.lastName || '',
                        email: a.email || '',
                        role: a.role || '',
                        username: a.username || '',
                    });
                } else {
                    setLoadError(data?.message || 'Could not load your admin profile.');
                }
            } catch {
                setLoadError('Could not load your admin profile. Please refresh the page.');
            }
            setLoading(false);
        })();

        (async () => {
            try {
                const { data, ok } = await adminApi.get('/admin/app-config');
                if (ok && data.success && data.config?.supportEmail) {
                    setSupportEmail(data.config.supportEmail);
                }
            } catch {
                // Non-fatal - the support email form just starts blank; its own save flow will surface errors.
            }
        })();
    }, []);

    const avatarInitials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || profile.username?.[0]?.toUpperCase() || 'A';

    const handleProfileChange = (event) => {
        const { name, value } = event.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();

        if (!profile.firstName?.trim() || !profile.email?.trim()) {
            setProfileMsg({ text: 'Name and email are required.', type: 'error' });
            return;
        }

        const emailVal = validateEmailStrict(profile.email);
        if (!emailVal.isValid) {
            setProfileMsg({ text: emailVal.message, type: 'error' });
            return;
        }

        setProfileSaving(true);
        setProfileMsg({ text: '', type: '' });
        try {
            const { data, ok } = await adminApi.put('/admin/profile', {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: emailVal.email,
            });
            if (ok && data.success) {
                setProfileMsg({ text: 'Profile saved successfully!', type: 'success' });
            } else {
                setProfileMsg({ text: data.message || 'Could not save profile.', type: 'error' });
            }
        } catch {
            setProfileMsg({ text: 'Could not save profile. Please try again.', type: 'error' });
        } finally {
            setProfileSaving(false);
        }
        setTimeout(() => setProfileMsg({ text: '', type: '' }), 4000);
    };

    const handlePwChange = (event) => {
        const { name, value } = event.target;
        setPasswords((prev) => ({ ...prev, [name]: value }));
    };

    const toggleShow = (name) => {
        setShow((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const handlePasswordSave = async (event) => {
        event.preventDefault();

        if (!passwords.current || !passwords.newPass || !passwords.confirm) {
            setPwMsg({ text: 'All password fields are required.', type: 'error' });
            return;
        }
        if (passwords.newPass.length < 6) {
            setPwMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
            return;
        }
        if (passwords.newPass !== passwords.confirm) {
            setPwMsg({ text: 'New password and confirmation do not match.', type: 'error' });
            return;
        }

        setPwSaving(true);
        setPwMsg({ text: '', type: '' });
        try {
            const { data, ok } = await adminApi.put('/admin/password', {
                currentPassword: passwords.current,
                newPassword: passwords.newPass,
            });
            if (ok && data.success) {
                setPwMsg({ text: 'Password updated successfully!', type: 'success' });
                setPasswords({ current: '', newPass: '', confirm: '' });
            } else {
                setPwMsg({ text: data.message || 'Could not update password.', type: 'error' });
            }
        } catch {
            setPwMsg({ text: 'Could not update password. Please try again.', type: 'error' });
        } finally {
            setPwSaving(false);
        }
        setTimeout(() => setPwMsg({ text: '', type: '' }), 3000);
    };

    const handleSupportSave = async (event) => {
        event.preventDefault();
        if (!supportEmail.trim()) {
            setSupportMsg({ text: 'Support email is required.', type: 'error' });
            return;
        }

        const emailVal = validateEmailStrict(supportEmail);
        if (!emailVal.isValid) {
            setSupportMsg({ text: emailVal.message, type: 'error' });
            return;
        }

        setSupportSaving(true);
        setSupportMsg({ text: '', type: '' });
        try {
            const { data, ok } = await adminApi.put('/admin/app-config', { supportEmail: emailVal.email });
            if (ok && data.success) {
                setSupportMsg({ text: 'Support email updated successfully!', type: 'success' });
            } else {
                setSupportMsg({ text: data.message || 'Could not update support email.', type: 'error' });
            }
        } catch {
            setSupportMsg({ text: 'Could not update support email. Please try again.', type: 'error' });
        } finally {
            setSupportSaving(false);
        }
        setTimeout(() => setSupportMsg({ text: '', type: '' }), 4000);
    };



    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Admin Profile</h1>
                <p className="text-sm text-zinc-500 mt-1">Manage your admin account details and password.</p>
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {loadError}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Profile Info */}
                <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-sm font-bold text-brand-600">
                            {avatarInitials}
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900">Profile Information</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Update your display name and email</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileSave} className="space-y-4">
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">First Name</span>
                            <Input type="text" name="firstName" value={profile.firstName} onChange={handleProfileChange} placeholder="First name" />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Last Name</span>
                            <Input type="text" name="lastName" value={profile.lastName} onChange={handleProfileChange} placeholder="Last name" />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Email Address</span>
                            <Input type="email" name="email" value={profile.email} onChange={handleProfileChange} placeholder="admin@Hemsely.app" />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Role</span>
                            <Input type="text" value={profile.role} disabled className="capitalize" />
                        </label>
                        <div className="flex items-center justify-between pt-2">
                            <div className="text-sm font-semibold min-h-5">
                                {profileMsg.text && (
                                    <span className={profileMsg.type === 'success' ? 'text-success-600' : 'text-danger-600'}>
                                        {profileMsg.text}
                                    </span>
                                )}
                            </div>
                            <Button type="submit" disabled={profileSaving || loading}>
                                <Save className="w-4 h-4" />
                                {profileSaving ? 'Saving...' : loading ? 'Loading...' : 'Save Profile'}
                            </Button>
                        </div>
                    </form>
                </section>

                <div className="space-y-6">
                    {/* Change Password */}
                    <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900">Change Password</h2>
                                <p className="text-xs text-zinc-500 mt-0.5">Use a strong password with 6+ characters</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSave} className="space-y-4">
                            <PasswordInput label="Current Password" name="current" placeholder="Enter current password" value={passwords.current} onChange={handlePwChange} isVisible={show.current} onToggleShow={() => toggleShow('current')} />
                            <PasswordInput label="New Password" name="newPass" placeholder="Enter new password" value={passwords.newPass} onChange={handlePwChange} isVisible={show.newPass} onToggleShow={() => toggleShow('newPass')} />
                            <PasswordInput label="Confirm New Password" name="confirm" placeholder="Re-enter new password" value={passwords.confirm} onChange={handlePwChange} isVisible={show.confirm} onToggleShow={() => toggleShow('confirm')} />
                            <div className="flex items-center justify-between pt-2">
                                <div className="text-sm font-semibold min-h-5">
                                    {pwMsg.text && (
                                        <span className={pwMsg.type === 'success' ? 'text-success-600' : 'text-danger-600'}>
                                            {pwMsg.text}
                                        </span>
                                    )}
                                </div>
                                <Button type="submit" disabled={pwSaving}>
                                    <ShieldCheck className="w-4 h-4" />
                                    {pwSaving ? 'Updating...' : 'Update Password'}
                                </Button>
                            </div>
                        </form>
                    </section>

                    {/* Support Email (Placed Under Change Password) */}
                    <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900">Support Email</h2>
                                <p className="text-xs text-zinc-500 mt-0.5">Platform support contact email for users</p>
                            </div>
                        </div>

                        <form onSubmit={handleSupportSave} className="space-y-4">
                            <label className="block">
                                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Support Email Address</span>
                                <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@hemeshly.app" required />
                            </label>
                            <div className="flex items-center justify-between pt-2">
                                <div className="text-sm font-semibold min-h-5">
                                    {supportMsg.text && (
                                        <span className={supportMsg.type === 'success' ? 'text-success-600' : 'text-danger-600'}>
                                            {supportMsg.text}
                                        </span>
                                    )}
                                </div>
                                <Button type="submit" disabled={supportSaving}>
                                    <Save className="w-4 h-4" />
                                    {supportSaving ? 'Saving...' : 'Save Support Email'}
                                </Button>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdminProfilePage;
