import React, { useEffect, useState } from 'react';
import {
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    Save,
    Mail,
    UserPlus,
    Users,
    KeyRound,
    Trash2,
    CheckSquare,
    Square,
    Search,
    Shield,
    CheckCircle2,
    XCircle,
    UserCheck,
    Edit3,
} from 'lucide-react';
import adminApi from '../services/adminApi';
import { Input, Label } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Modal } from '../../../shared/components/ui/Modal';
import { validateEmailStrict } from '../../../shared/utils/emailValidator';
import { ADMIN_PERMISSIONS, ALL_PERMISSION_IDS } from '../constants/adminPermissions';

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
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'subadmins'
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

    // Sub-Admin State
    const [subAdmins, setSubAdmins] = useState([]);
    const [subAdminsLoading, setSubAdminsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Create Sub-Admin Modal State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        permissions: [...ALL_PERMISSION_IDS],
    });
    const [showCreatePw, setShowCreatePw] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState('');

    // Edit Permissions Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedSubAdmin, setSelectedSubAdmin] = useState(null);
    const [editPermissions, setEditPermissions] = useState([]);
    const [editSaving, setEditSaving] = useState(false);
    const [editMsg, setEditMsg] = useState({ text: '', type: '' });

    // Reset Password Modal State
    const [resetPwModalOpen, setResetPwModalOpen] = useState(false);
    const [resetPwTarget, setResetPwTarget] = useState(null);
    const [newSubAdminPw, setNewSubAdminPw] = useState('');
    const [showResetPw, setShowResetPw] = useState(false);
    const [resetPwSaving, setResetPwSaving] = useState(false);
    const [resetPwMsg, setResetPwMsg] = useState({ text: '', type: '' });

    // Delete Confirm Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const isSuperAdmin = profile.role === 'superadmin';

    const fetchProfile = async () => {
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
                if (a.role === 'superadmin') {
                    fetchSubAdmins();
                }
            } else {
                setLoadError(data?.message || 'Could not load your admin profile.');
            }
        } catch {
            setLoadError('Could not load your admin profile. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubAdmins = async () => {
        setSubAdminsLoading(true);
        try {
            const { data, ok } = await adminApi.get('/admin/subadmins');
            if (ok && data.success) {
                setSubAdmins(data.subAdmins || []);
            }
        } catch {
            // non-fatal
        } finally {
            setSubAdminsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        (async () => {
            try {
                const { data, ok } = await adminApi.get('/admin/app-config');
                if (ok && data.success && data.config?.supportEmail) {
                    setSupportEmail(data.config.supportEmail);
                }
            } catch {
                // Non-fatal
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Sub-Admin Handlers
    const toggleCreatePermission = (permId) => {
        setCreateForm((prev) => {
            const exists = prev.permissions.includes(permId);
            return {
                ...prev,
                permissions: exists
                    ? prev.permissions.filter((p) => p !== permId)
                    : [...prev.permissions, permId],
            };
        });
    };

    const selectAllCreatePermissions = () => {
        setCreateForm((prev) => ({ ...prev, permissions: [...ALL_PERMISSION_IDS] }));
    };

    const deselectAllCreatePermissions = () => {
        setCreateForm((prev) => ({ ...prev, permissions: [] }));
    };

    const handleCreateSubAdmin = async (e) => {
        e.preventDefault();
        setCreateError('');

        if (!createForm.email.trim() || !createForm.password) {
            setCreateError('Email and password are required.');
            return;
        }

        const emailCheck = validateEmailStrict(createForm.email);
        if (!emailCheck.isValid) {
            setCreateError(emailCheck.message);
            return;
        }

        if (createForm.password.length < 6) {
            setCreateError('Password must be at least 6 characters.');
            return;
        }

        setCreateSaving(true);
        try {
            const { data, ok } = await adminApi.post('/admin/subadmins', {
                email: emailCheck.email,
                password: createForm.password,
                firstName: createForm.firstName.trim(),
                lastName: createForm.lastName.trim(),
                permissions: createForm.permissions,
            });

            if (ok && data.success) {
                setCreateModalOpen(false);
                setCreateForm({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    permissions: [...ALL_PERMISSION_IDS],
                });
                fetchSubAdmins();
            } else {
                setCreateError(data?.message || 'Could not create sub-admin.');
            }
        } catch {
            setCreateError('Server error creating sub-admin. Please try again.');
        } finally {
            setCreateSaving(false);
        }
    };

    // Toggle Sub-Admin Active Status
    const handleToggleStatus = async (subAdmin) => {
        try {
            const { data, ok } = await adminApi.patch(`/admin/subadmins/${subAdmin._id}/status`, {
                isActive: !subAdmin.isActive,
            });
            if (ok && data.success) {
                setSubAdmins((prev) =>
                    prev.map((s) => (s._id === subAdmin._id ? { ...s, isActive: !s.isActive } : s))
                );
            }
        } catch {
            // failed
        }
    };

    // Edit Permissions Handlers
    const openEditPermissionsModal = (subAdmin) => {
        setSelectedSubAdmin(subAdmin);
        setEditPermissions(Array.isArray(subAdmin.permissions) ? [...subAdmin.permissions] : []);
        setEditMsg({ text: '', type: '' });
        setEditModalOpen(true);
    };

    const toggleEditPermission = (permId) => {
        setEditPermissions((prev) => {
            const exists = prev.includes(permId);
            return exists ? prev.filter((p) => p !== permId) : [...prev, permId];
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedSubAdmin) return;
        setEditSaving(true);
        setEditMsg({ text: '', type: '' });
        try {
            const { data, ok } = await adminApi.put(`/admin/subadmins/${selectedSubAdmin._id}`, {
                permissions: editPermissions,
            });
            if (ok && data.success) {
                setEditMsg({ text: 'Permissions updated successfully!', type: 'success' });
                setSubAdmins((prev) =>
                    prev.map((s) => (s._id === selectedSubAdmin._id ? { ...s, permissions: editPermissions } : s))
                );
                setTimeout(() => setEditModalOpen(false), 1200);
            } else {
                setEditMsg({ text: data?.message || 'Failed to update permissions.', type: 'error' });
            }
        } catch {
            setEditMsg({ text: 'Error updating permissions.', type: 'error' });
        } finally {
            setEditSaving(false);
        }
    };

    // Reset Password Handlers
    const openResetPasswordModal = (subAdmin) => {
        setResetPwTarget(subAdmin);
        setNewSubAdminPw('');
        setResetPwMsg({ text: '', type: '' });
        setResetPwModalOpen(true);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!resetPwTarget || !newSubAdminPw) return;
        if (newSubAdminPw.length < 6) {
            setResetPwMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
            return;
        }

        setResetPwSaving(true);
        setResetPwMsg({ text: '', type: '' });
        try {
            const { data, ok } = await adminApi.patch(`/admin/subadmins/${resetPwTarget._id}/password`, {
                newPassword: newSubAdminPw,
            });
            if (ok && data.success) {
                setResetPwMsg({ text: 'Password reset successfully!', type: 'success' });
                setTimeout(() => setResetPwModalOpen(false), 1200);
            } else {
                setResetPwMsg({ text: data?.message || 'Could not reset password.', type: 'error' });
            }
        } catch {
            setResetPwMsg({ text: 'Error resetting password.', type: 'error' });
        } finally {
            setResetPwSaving(false);
        }
    };

    // Delete Sub-Admin Handlers
    const openDeleteModal = (subAdmin) => {
        setDeleteTarget(subAdmin);
        setDeleteModalOpen(true);
    };

    const handleDeleteSubAdmin = async () => {
        if (!deleteTarget) return;
        setDeleteSaving(true);
        try {
            const { data, ok } = await adminApi.delete(`/admin/subadmins/${deleteTarget._id}`);
            if (ok && data.success) {
                setSubAdmins((prev) => prev.filter((s) => s._id !== deleteTarget._id));
                setDeleteModalOpen(false);
            }
        } catch {
            // failed
        } finally {
            setDeleteSaving(false);
        }
    };

    const filteredSubAdmins = subAdmins.filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        return fullName.includes(q) || s.email?.toLowerCase().includes(q);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Admin Profile & Access</h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage your administrator account details, security, and sub-admin staff access.</p>
                </div>
                {isSuperAdmin && (
                    <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border-0 ${
                                activeTab === 'profile'
                                    ? 'bg-white text-zinc-900 shadow-sm'
                                    : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                            }`}
                        >
                            My Profile
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('subadmins')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border-0 flex items-center gap-1.5 ${
                                activeTab === 'subadmins'
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                            }`}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Sub-Admins & Permissions</span>
                            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-brand-100 text-brand-700">
                                {subAdmins.length}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {loadError}
                </div>
            )}

            {activeTab === 'profile' ? (
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

                        {/* Support Email */}
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
            ) : (
                /* Sub-Admin Management Tab */
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-zinc-900">Sub-Administrator Accounts</h2>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    Grant specific sidebar pages access to your support staff, moderators, and analysts.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-xs py-2 w-52 sm:w-64"
                                />
                            </div>
                            <Button onClick={() => setCreateModalOpen(true)} className="gap-2 shrink-0">
                                <UserPlus className="w-4 h-4" />
                                <span>Create Sub-Admin</span>
                            </Button>
                        </div>
                    </div>

                    {/* Sub-Admins List */}
                    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                        {subAdminsLoading ? (
                            <div className="flex justify-center items-center py-16">
                                <div className="h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
                            </div>
                        ) : filteredSubAdmins.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400 mb-3">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-zinc-800">No Sub-Admins Found</h3>
                                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                                    {searchQuery ? 'No sub-admin matches your search filter.' : 'Create sub-administrators to delegate panel tasks with custom page permissions.'}
                                </p>
                                {!searchQuery && (
                                    <Button onClick={() => setCreateModalOpen(true)} className="mt-4 gap-2 text-xs">
                                        <UserPlus className="w-4 h-4" /> Create First Sub-Admin
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                            <th className="py-3.5 px-5">Sub-Admin Profile</th>
                                            <th className="py-3.5 px-4">Allowed Pages Access</th>
                                            <th className="py-3.5 px-4">Account Status</th>
                                            <th className="py-3.5 px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 text-sm">
                                        {filteredSubAdmins.map((subAdmin) => {
                                            const subInitials = `${subAdmin.firstName?.[0] || ''}${subAdmin.lastName?.[0] || ''}`.toUpperCase() || subAdmin.email?.[0]?.toUpperCase() || 'S';
                                            const permissionsCount = Array.isArray(subAdmin.permissions) ? subAdmin.permissions.length : 0;
                                            const fullName = `${subAdmin.firstName || ''} ${subAdmin.lastName || ''}`.trim() || 'Sub-Admin';

                                            return (
                                                <tr key={subAdmin._id} className="hover:bg-zinc-50/50 transition-colors">
                                                    <td className="py-4 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                                                                {subInitials}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-zinc-900 truncate">
                                                                    {fullName}
                                                                </p>
                                                                <p className="text-xs text-zinc-500 truncate">{subAdmin.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                                            <Badge variant="brand" className="font-bold">
                                                                {permissionsCount} / {ALL_PERMISSION_IDS.length} Pages
                                                            </Badge>
                                                            {Array.isArray(subAdmin.permissions) && subAdmin.permissions.slice(0, 3).map((pId) => {
                                                                const perm = ADMIN_PERMISSIONS.find((p) => p.id === pId);
                                                                return (
                                                                    <span
                                                                        key={pId}
                                                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-700"
                                                                    >
                                                                        {perm ? perm.label : pId}
                                                                    </span>
                                                                );
                                                            })}
                                                            {permissionsCount > 3 && (
                                                                <span className="text-[10px] font-bold text-zinc-400">
                                                                    +{permissionsCount - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStatus(subAdmin)}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer border-0 ${
                                                                subAdmin.isActive
                                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                                                            }`}
                                                            title="Click to toggle status"
                                                        >
                                                            {subAdmin.isActive ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>Active</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                                                                    <span>Inactive</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditPermissionsModal(subAdmin)}
                                                                aria-label="Edit Permissions"
                                                                title="Edit Permissions"
                                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-brand-600 hover:bg-brand-50 transition-colors border-0 bg-transparent cursor-pointer"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openResetPasswordModal(subAdmin)}
                                                                aria-label="Reset Password"
                                                                title="Reset Password"
                                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-600 hover:bg-purple-50 transition-colors border-0 bg-transparent cursor-pointer"
                                                            >
                                                                <KeyRound className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openDeleteModal(subAdmin)}
                                                                aria-label="Delete Sub-Admin"
                                                                title="Delete Sub-Admin"
                                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CREATE SUB-ADMIN MODAL */}
            <Modal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Create New Sub-Administrator"
                className="max-w-2xl max-h-[88vh] overflow-y-auto"
            >
                <form onSubmit={handleCreateSubAdmin} className="space-y-5">
                    {createError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold px-4 py-2.5">
                            {createError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">First Name</span>
                            <Input
                                type="text"
                                placeholder="e.g. Ankit"
                                value={createForm.firstName}
                                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Last Name</span>
                            <Input
                                type="text"
                                placeholder="e.g. Ahirwar"
                                value={createForm.lastName}
                                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                            />
                        </label>
                    </div>

                    <div>
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Email Address *</span>
                            <Input
                                type="email"
                                placeholder="e.g. ankit@hemsely.app"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                required
                            />
                        </label>
                    </div>

                    <div>
                        <Label htmlFor="create-pw">Password * (Min 6 characters)</Label>
                        <div className="relative">
                            <Input
                                id="create-pw"
                                type={showCreatePw ? 'text' : 'password'}
                                placeholder="Create secure password"
                                value={createForm.password}
                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                className="pr-11"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCreatePw(!showCreatePw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 bg-transparent border-0 cursor-pointer"
                            >
                                {showCreatePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Permission Checkboxes Grid */}
                    <div className="pt-2 border-t border-zinc-100">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                                    Sidebar Pages Access Permissions
                                </h4>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    Tick the pages that this sub-administrator is permitted to view and manage.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllCreatePermissions}
                                    className="px-2.5 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1"
                                >
                                    <CheckSquare className="w-3.5 h-3.5" /> Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAllCreatePermissions}
                                    className="px-2.5 py-1 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1"
                                >
                                    <Square className="w-3.5 h-3.5" /> Clear
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1 border border-zinc-100 rounded-xl bg-zinc-50/50">
                            {ADMIN_PERMISSIONS.map((perm) => {
                                const Icon = perm.icon;
                                const isChecked = createForm.permissions.includes(perm.id);

                                return (
                                    <div
                                        key={perm.id}
                                        onClick={() => toggleCreatePermission(perm.id)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                            isChecked
                                                ? 'bg-brand-50/50 border-brand-300 shadow-sm'
                                                : 'bg-white border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        <div className="mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {}} // Handled by parent div
                                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-zinc-300 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <Icon className={`w-4 h-4 shrink-0 ${isChecked ? 'text-brand-600' : 'text-zinc-500'}`} />
                                                <span className="text-xs font-bold text-zinc-900">{perm.label}</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                                                {perm.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                        <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createSaving} className="gap-2">
                            <UserCheck className="w-4 h-4" />
                            {createSaving ? 'Creating...' : 'Create Sub-Admin'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* EDIT PERMISSIONS MODAL */}
            <Modal
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={`Edit Permissions: ${selectedSubAdmin?.firstName || selectedSubAdmin?.email || 'Sub-Admin'}`}
                className="max-w-2xl max-h-[88vh] overflow-y-auto"
            >
                <div className="space-y-5">
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-zinc-900">
                                {`${selectedSubAdmin?.firstName || ''} ${selectedSubAdmin?.lastName || ''}`.trim() || 'Sub-Admin'}
                            </p>
                            <p className="text-[11px] text-zinc-500">{selectedSubAdmin?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setEditPermissions([...ALL_PERMISSION_IDS])}
                                className="px-2.5 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1"
                            >
                                <CheckSquare className="w-3.5 h-3.5" /> Select All
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditPermissions([])}
                                className="px-2.5 py-1 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1"
                            >
                                <Square className="w-3.5 h-3.5" /> Clear
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1 border border-zinc-100 rounded-xl bg-zinc-50/50">
                        {ADMIN_PERMISSIONS.map((perm) => {
                            const Icon = perm.icon;
                            const isChecked = editPermissions.includes(perm.id);

                            return (
                                <div
                                    key={perm.id}
                                    onClick={() => toggleEditPermission(perm.id)}
                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                        isChecked
                                            ? 'bg-brand-50/50 border-brand-300 shadow-sm'
                                            : 'bg-white border-zinc-200 hover:border-zinc-300'
                                    }`}
                                >
                                    <div className="mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {}}
                                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-zinc-300 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <Icon className={`w-4 h-4 shrink-0 ${isChecked ? 'text-brand-600' : 'text-zinc-500'}`} />
                                            <span className="text-xs font-bold text-zinc-900">{perm.label}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                                            {perm.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {editMsg.text && (
                        <div
                            className={`rounded-xl border text-xs font-semibold px-4 py-2.5 ${
                                editMsg.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                        >
                            {editMsg.text}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                        <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePermissions} disabled={editSaving} className="gap-2">
                            <Save className="w-4 h-4" />
                            {editSaving ? 'Saving...' : 'Save Permissions'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* RESET PASSWORD MODAL */}
            <Modal
                open={resetPwModalOpen}
                onClose={() => setResetPwModalOpen(false)}
                title={`Reset Password: ${resetPwTarget?.firstName || resetPwTarget?.email || ''}`}
                className="max-w-md"
            >
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-xs text-zinc-500">
                        Enter a new password for sub-admin <strong>{resetPwTarget?.email}</strong>.
                    </p>

                    <div>
                        <Label htmlFor="reset-sub-pw">New Password (Min 6 characters)</Label>
                        <div className="relative">
                            <Input
                                id="reset-sub-pw"
                                type={showResetPw ? 'text' : 'password'}
                                placeholder="Enter new password"
                                value={newSubAdminPw}
                                onChange={(e) => setNewSubAdminPw(e.target.value)}
                                className="pr-11"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowResetPw(!showResetPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 bg-transparent border-0 cursor-pointer"
                            >
                                {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {resetPwMsg.text && (
                        <div
                            className={`rounded-xl border text-xs font-semibold px-4 py-2.5 ${
                                resetPwMsg.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                        >
                            {resetPwMsg.text}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                        <Button type="button" variant="outline" onClick={() => setResetPwModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={resetPwSaving} className="gap-2">
                            <KeyRound className="w-4 h-4" />
                            {resetPwSaving ? 'Updating...' : 'Reset Password'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* DELETE SUB-ADMIN MODAL */}
            <Modal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Sub-Admin Account"
                className="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-zinc-600 leading-relaxed">
                        Are you sure you want to permanently delete sub-admin account{' '}
                        <strong>{deleteTarget?.email}</strong>? They will no longer be able to log in to the admin panel.
                    </p>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                        <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteSubAdmin}
                            disabled={deleteSaving}
                            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleteSaving ? 'Deleting...' : 'Delete Account'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminProfilePage;
