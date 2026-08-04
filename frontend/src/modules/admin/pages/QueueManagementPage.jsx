import React, { useEffect, useState } from 'react';
import { Clock3, ShieldCheck, ToggleLeft, ToggleRight, Users, Activity, UsersRound, Save, Globe } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import { Input, Label, Select } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const QUEUE_RADIUS_MIN = 1;
const QUEUE_RADIUS_MAX = 20000;

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
    const [queueForm, setQueueForm] = useState({ queueRatioMale: 1, queueRatioFemale: 4, queueScope: 'country', queueRadiusKm: 25 });
    const [savedMessage, setSavedMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loadError, setLoadError] = useState('');

    const loadAll = async () => {
        setLoadError('');
        try {
            const [configRes, snapshotRes] = await Promise.all([
                adminApi.get('/admin/app-config'),
                adminApi.get('/admin/queue-status'),
            ]);
            if (configRes.ok && configRes.data.success) {
                setConfig(configRes.data.config);
                setQueueForm({
                    queueRatioMale: configRes.data.config.queueRatioMale,
                    queueRatioFemale: configRes.data.config.queueRatioFemale,
                    queueScope: configRes.data.config.queueScope,
                    queueRadiusKm: configRes.data.config.queueRadiusKm,
                });
            } else {
                setLoadError(configRes.data?.message || 'Could not load queue settings.');
            }
            if (snapshotRes.ok && snapshotRes.data.success) setSnapshot(snapshotRes.data);
        } catch {
            setLoadError('Could not load queue settings. Please try again.');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAll();
    }, []);

    // Turning these two OFF has an immediate, hard-to-undo effect on real users -
    // releasing the entire queue, or locking out all new signups - so they get a
    // confirmation, matching how AppConfigPage already guards maintenance mode.
    const DESTRUCTIVE_OFF_CONFIRM = {
        genderQueueEnabled: 'Turning this OFF immediately releases every queued male user into active status. Continue?',
        signupsEnabled: 'Turning this OFF immediately blocks all new user signups platform-wide. Continue?',
    };

    const updateSetting = async (key) => {
        const nextValue = !config[key];
        if (!nextValue && DESTRUCTIVE_OFF_CONFIRM[key] && !window.confirm(DESTRUCTIVE_OFF_CONFIRM[key])) {
            return;
        }

        setSaving(true);
        setErrorMessage('');
        try {
            const { data, ok } = await adminApi.put('/admin/app-config', { [key]: nextValue });
            if (ok && data.success) {
                setConfig(data.config);
                const snapshotRes = await adminApi.get('/admin/queue-status');
                if (snapshotRes.ok && snapshotRes.data.success) setSnapshot(snapshotRes.data);
                setSavedMessage('Queue settings updated successfully.');
                setTimeout(() => setSavedMessage(''), 3000);
            } else {
                setErrorMessage(data?.message || 'Could not update this setting.');
            }
        } catch {
            setErrorMessage('Could not update this setting. Please try again.');
        }
        setSaving(false);
    };

    const handleSaveQueueSettings = async () => {
        setErrorMessage('');

        const radiusKm = Number(queueForm.queueRadiusKm);
        if (queueForm.queueScope === 'radius' && (!Number.isFinite(radiusKm) || radiusKm < QUEUE_RADIUS_MIN || radiusKm > QUEUE_RADIUS_MAX)) {
            setErrorMessage(`Radius must be between ${QUEUE_RADIUS_MIN} and ${QUEUE_RADIUS_MAX} km.`);
            return;
        }

        setSaving(true);
        try {
            const { data, ok } = await adminApi.put('/admin/app-config', {
                queueRatioMale: Number(queueForm.queueRatioMale),
                queueRatioFemale: Number(queueForm.queueRatioFemale),
                queueScope: queueForm.queueScope,
                queueRadiusKm: radiusKm,
            });
            if (ok && data.success) {
                setConfig(data.config);
                const snapshotRes = await adminApi.get('/admin/queue-status');
                if (snapshotRes.ok && snapshotRes.data.success) setSnapshot(snapshotRes.data);
                setSavedMessage('Queue ratio and scope updated successfully.');
                setTimeout(() => setSavedMessage(''), 3000);
            } else {
                setErrorMessage(data?.message || 'Could not update the queue settings.');
            }
        } catch {
            setErrorMessage('Could not update the queue settings. Please try again.');
        }
        setSaving(false);
    };

    if (loading) return <PageSpinner />;

    if (!config) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <p className="text-sm font-semibold text-zinc-700">{loadError || 'Could not load queue settings.'}</p>
                <Button onClick={loadAll}>Retry</Button>
            </div>
        );
    }

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
                        <p className="text-xs text-zinc-500 mt-0.5">New male users beyond the ratio wait in queue or buy instant access. Scope can be country-wide or radius-based.</p>
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
                        <Input id="ratio-male" type="number" min="1" value={queueForm.queueRatioMale} onChange={(e) => setQueueForm((p) => ({ ...p, queueRatioMale: e.target.value }))} className="w-24" />
                    </div>
                    <span className="text-zinc-400 font-bold pb-2.5">:</span>
                    <div>
                        <Label htmlFor="ratio-female">Female</Label>
                        <Input id="ratio-female" type="number" min="1" value={queueForm.queueRatioFemale} onChange={(e) => setQueueForm((p) => ({ ...p, queueRatioFemale: e.target.value }))} className="w-24" />
                    </div>
                    <div>
                        <Label htmlFor="queue-scope">Scope</Label>
                        <Select id="queue-scope" value={queueForm.queueScope} onChange={(e) => setQueueForm((p) => ({ ...p, queueScope: e.target.value }))} className="w-40">
                            <option value="country">Country-wide</option>
                            <option value="radius">Radius-based</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="queue-radius">Radius (km)</Label>
                        <Input
                            id="queue-radius"
                            type="number"
                            min={QUEUE_RADIUS_MIN}
                            max={QUEUE_RADIUS_MAX}
                            disabled={queueForm.queueScope !== 'radius'}
                            value={queueForm.queueRadiusKm}
                            onChange={(e) => setQueueForm((p) => ({ ...p, queueRadiusKm: e.target.value }))}
                            className="w-28"
                        />
                    </div>
                    <Button disabled={saving} onClick={handleSaveQueueSettings}>
                        <Save className="w-4 h-4" /> Save Ratio & Scope
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
                    <Globe className="w-3.5 h-3.5" />
                    Scope: <span className="font-bold text-zinc-700 capitalize">{config.queueScope}</span>
                    {config.queueScope === 'radius' && <> — {config.queueRadiusKm}km around each male&apos;s own location</>}. The stat tiles above are always country-wide totals; an individual male&apos;s actual eligibility can differ when scope is radius.
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
                {errorMessage && (
                    <div className="text-sm font-bold text-danger-600">{errorMessage}</div>
                )}
            </div>
        </div>
    );
};

export default QueueManagementPage;
