import React, { useEffect, useState } from 'react';
import { Clock3, ShieldCheck, ToggleLeft, ToggleRight, Users, Activity, UsersRound, Save, Globe } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import { Input, Label } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const ToggleRow = ({ icon: Icon, title, description, checked, onChange, disabled }) => (
    <div className="rounded-xl bg-white border border-zinc-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shadow-sm flex items-center justify-center">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-base font-bold text-zinc-900">{title}</h3>
                <p className="text-sm text-zinc-500 mt-1 max-w-xl pr-4">{description}</p>
            </div>
        </div>

        <button
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 transition-colors border shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-success-50 border-emerald-200 text-success-600 hover:bg-emerald-100' : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}
            aria-pressed={checked}
        >
            {checked ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-zinc-400" />}
            <span className="text-sm font-bold w-8 text-left">{checked ? 'ON' : 'OFF'}</span>
        </button>
    </div>
);

const StatTile = ({ label, value, accent }) => (
    <div className="rounded-xl bg-white border border-zinc-200 shadow-sm p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${accent || 'text-zinc-900'}`}>{value}</p>
    </div>
);

const QueueManagementPage = () => {
    const [config, setConfig] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ratioForm, setRatioForm] = useState({ queueRatioMale: 1, queueRatioFemale: 4 });
    const [savedMessage, setSavedMessage] = useState('');

    const loadAll = async () => {
        const [configRes, snapshotRes] = await Promise.all([
            adminApi.get('/admin/app-config'),
            adminApi.get('/admin/queue-status'),
        ]);
        if (configRes.ok && configRes.data.success) {
            setConfig(configRes.data.config);
            setRatioForm({
                queueRatioMale: configRes.data.config.queueRatioMale,
                queueRatioFemale: configRes.data.config.queueRatioFemale,
            });
        }
        if (snapshotRes.ok && snapshotRes.data.success) setSnapshot(snapshotRes.data);
        setLoading(false);
    };

    useEffect(() => {
        loadAll();
    }, []);

    const updateSetting = async (key) => {
        setSaving(true);
        const { data, ok } = await adminApi.put('/admin/app-config', { [key]: !config[key] });
        if (ok && data.success) {
            setConfig(data.config);
            const snapshotRes = await adminApi.get('/admin/queue-status');
            if (snapshotRes.ok && snapshotRes.data.success) setSnapshot(snapshotRes.data);
            setSavedMessage('Queue settings updated successfully.');
            setTimeout(() => setSavedMessage(''), 3000);
        }
        setSaving(false);
    };

    const handleSaveRatio = async () => {
        setSaving(true);
        const { data, ok } = await adminApi.put('/admin/app-config', {
            queueRatioMale: Number(ratioForm.queueRatioMale),
            queueRatioFemale: Number(ratioForm.queueRatioFemale),
        });
        if (ok && data.success) {
            setConfig(data.config);
            const snapshotRes = await adminApi.get('/admin/queue-status');
            if (snapshotRes.ok && snapshotRes.data.success) setSnapshot(snapshotRes.data);
            setSavedMessage('Gender ratio updated successfully.');
            setTimeout(() => setSavedMessage(''), 3000);
        }
        setSaving(false);
    };

    if (loading || !config) return <PageSpinner />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Queue Management</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Control platform entry flow, gender ratio access, and queued feature visibility.
                </p>
            </div>

            {/* Gender Ratio Queue */}
            <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                        <UsersRound className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900">Gender Ratio Access Queue</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">New male users beyond the ratio wait in queue or buy instant access. Phase 1: country-wide.</p>
                    </div>
                </div>

                {snapshot && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <StatTile label="Active Males" value={snapshot.activeMales} />
                        <StatTile label="Active Females" value={snapshot.activeFemales} />
                        <StatTile label="Allowed Males" value={snapshot.allowedMales} />
                        <StatTile label="Queued Males" value={snapshot.queuedMales} accent={snapshot.queuedMales > 0 ? 'text-amber-600' : 'text-zinc-900'} />
                    </div>
                )}

                <div className="flex flex-wrap items-end gap-3 mb-5">
                    <div>
                        <Label htmlFor="ratio-male">Male</Label>
                        <Input id="ratio-male" type="number" min="1" value={ratioForm.queueRatioMale} onChange={(e) => setRatioForm((p) => ({ ...p, queueRatioMale: e.target.value }))} className="w-24" />
                    </div>
                    <span className="text-zinc-400 font-bold pb-2.5">:</span>
                    <div>
                        <Label htmlFor="ratio-female">Female</Label>
                        <Input id="ratio-female" type="number" min="1" value={ratioForm.queueRatioFemale} onChange={(e) => setRatioForm((p) => ({ ...p, queueRatioFemale: e.target.value }))} className="w-24" />
                    </div>
                    <Button disabled={saving} onClick={handleSaveRatio}>
                        <Save className="w-4 h-4" /> Save Ratio
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
                    <Globe className="w-3.5 h-3.5" />
                    Scope: <span className="font-bold text-zinc-700 capitalize">{config.queueScope}</span> (Phase 2 — radius-based, e.g. {config.queueRadiusKm}km — not yet enforced)
                </div>

                <div className="mt-4">
                    <ToggleRow
                        icon={Activity}
                        title="Enable Gender Ratio Queue"
                        description="Turn OFF to let all male users in instantly regardless of ratio."
                        checked={config.genderQueueEnabled}
                        onChange={() => updateSetting('genderQueueEnabled')}
                        disabled={saving}
                    />
                </div>
            </section>

            {/* Other queue toggles */}
            <section className="space-y-4">
                <ToggleRow
                    icon={Users}
                    title="Allow New User Signups"
                    description="Controls the main registration gateway. If turned off, no new accounts can be created on the platform — enforced server-side."
                    checked={config.signupsEnabled}
                    onChange={() => updateSetting('signupsEnabled')}
                    disabled={saving}
                />

                <ToggleRow
                    icon={Clock3}
                    title="Hold Likes In Queue"
                    description="When enabled, users cannot see who liked them until the queue opens — enforced directly on the Likes You Received API."
                    checked={config.holdLikesQueue}
                    onChange={() => updateSetting('holdLikesQueue')}
                    disabled={saving}
                />
            </section>

            <div className="min-h-[24px]">
                {savedMessage && (
                    <div className="text-sm font-bold text-success-600 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        {savedMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueueManagementPage;
