import React, { useState } from 'react';
import { Eye, EyeOff, Globe, Lock, Save, ShieldCheck } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Input, Label } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const STORAGE_KEY = 'amora_admin_settings:v1';

const defaultSettings = {
    supportEmail: 'support@Hemsely.app',
    defaultLanguage: 'English',
    timezone: 'Asia/Kolkata',
    sessionTimeout: '30',
};

const loadSettings = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
        return defaultSettings;
    }
};

const PasswordInput = ({ label, name, placeholder, value, onChange, isVisible, onToggleShow }) => (
    <div>
        <Label htmlFor={`setting-pw-${name}`}>{label}</Label>
        <div className="relative">
            <Input
                id={`setting-pw-${name}`}
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
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    </div>
);

const AdminSettingsPage = () => {
    const [settings, setSettings] = useState(loadSettings);
    const [saved, setSaved] = useState('');

    const [isPasswordEditing, setIsPasswordEditing] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
    const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
    const [pwMsg, setPwMsg] = useState({ text: '', type: '' });
    const [pwSaving, setPwSaving] = useState(false);

    const updateField = (event) => {
        const { name, value } = event.target;
        setSettings((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!settings.supportEmail?.trim() || !settings.defaultLanguage?.trim() || !settings.timezone?.trim()) {
            setSaved('error');
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setSaved('success');
        setTimeout(() => setSaved(''), 2500);
    };

    const handlePasswordEditStart = () => setIsPasswordEditing(true);

    const handlePasswordCancel = () => {
        setIsPasswordEditing(false);
        setPasswords({ current: '', newPass: '', confirm: '' });
        setPwMsg({ text: '', type: '' });
    };

    const handlePwChange = (event) => {
        const { name, value } = event.target;
        setPasswords((prev) => ({ ...prev, [name]: value }));
    };

    const toggleShow = (name) => setShow((prev) => ({ ...prev, [name]: !prev[name] }));

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
        const { data, ok } = await adminApi.put('/admin/password', {
            currentPassword: passwords.current,
            newPassword: passwords.newPass,
        });
        setPwSaving(false);

        if (ok && data.success) {
            setPwMsg({ text: 'Password updated successfully!', type: 'success' });
            setTimeout(() => {
                setIsPasswordEditing(false);
                setPasswords({ current: '', newPass: '', confirm: '' });
                setPwMsg({ text: '', type: '' });
            }, 1500);
        } else {
            setPwMsg({ text: data.message || 'Could not update password.', type: 'error' });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium tracking-tight text-zinc-900">Admin Settings</h1>
                <p className="mt-1 text-sm text-zinc-500">Manage admin panel preferences and your account security.</p>
            </div>

            <div className="mx-auto max-w-4xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3 border-b border-zinc-100 pb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
                            <Globe className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900">General Settings</h2>
                            <p className="text-xs text-zinc-500">Edit the basic admin dashboard preferences (saved on this device).</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Support Email</span>
                            <Input type="email" name="supportEmail" value={settings.supportEmail} onChange={updateField} />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Default Language</span>
                            <Input type="text" name="defaultLanguage" value={settings.defaultLanguage} onChange={updateField} />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Timezone</span>
                            <Input type="text" name="timezone" value={settings.timezone} onChange={updateField} />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Session Timeout (minutes)</span>
                            <Input type="number" min="5" name="sessionTimeout" value={settings.sessionTimeout} onChange={updateField} />
                        </label>
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-2">
                        <div className="min-h-5 text-sm font-semibold">
                            {saved === 'success' && <span className="text-success-600">Settings saved successfully.</span>}
                            {saved === 'error' && <span className="text-danger-600">Please fill all required fields.</span>}
                        </div>
                        <Button onClick={handleSave}>
                            <Save className="h-4 w-4" />
                            Save Settings
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminSettingsPage;
