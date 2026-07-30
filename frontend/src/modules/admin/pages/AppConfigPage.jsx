import React, { useState, useEffect } from 'react';
import { Settings, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import { Input, Label } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const ToggleRow = ({ label, desc, configKey, isChecked, onToggle }) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-zinc-100 last:border-0">
        <div>
            <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900">{label}</p>
                {configKey === 'maintenanceMode' && isChecked && (
                    <span className="text-[10px] font-extrabold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
                        ⚠️ Active
                    </span>
                )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
        </div>
        <button
            type="button"
            onClick={() => onToggle(configKey)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 border text-sm font-bold transition-colors cursor-pointer ${
                isChecked
                    ? configKey === 'maintenanceMode'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-white border-zinc-300 text-zinc-500'
            }`}
        >
            {isChecked ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 text-zinc-400" />}
            {isChecked ? 'ON' : 'OFF'}
        </button>
    </div>
);

const NumberField = ({ label, desc, name, min, max, unit, value, onChange }) => (
    <div className="py-4 border-b border-zinc-100 last:border-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <label htmlFor={`num-${name}`} className="text-sm font-semibold text-zinc-900 block cursor-pointer">{label}</label>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Input
                    id={`num-${name}`}
                    type="number"
                    name={name}
                    value={value}
                    onChange={onChange}
                    min={min}
                    max={max}
                    className="w-24 text-center font-semibold"
                />
                {unit && <span className="text-xs text-zinc-500 font-semibold">{unit}</span>}
            </div>
        </div>
    </div>
);

const AppConfigPage = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        adminApi.get('/admin/app-config').then(({ data, ok }) => {
            if (ok && data.success) setConfig(data.config);
            setLoading(false);
        });
    }, []);

    const handleToggle = (key) => {
        if (key === 'maintenanceMode' && !config.maintenanceMode) {
            const confirmOn = window.confirm('Are you sure you want to turn ON Maintenance Mode? Non-admin users will be blocked from accessing the app.');
            if (!confirmOn) return;
        }
        setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    };

    const handleChange = (e) => {
        setConfig((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const { data, ok } = await adminApi.put('/admin/app-config', {
            maintenanceMode: config.maintenanceMode,
            signupsEnabled: config.signupsEnabled,
            dailyLikeLimit: Number(config.dailyLikeLimit),
            discoveryRadiusKm: Number(config.discoveryRadiusKm),
            maxAgeGapYears: Number(config.maxAgeGapYears),
            minAppVersion: config.minAppVersion,
        });
        setSaving(false);

        if (ok && data.success) {
            setConfig(data.config);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    if (loading || !config) return <PageSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">App Configuration</h1>
                    <p className="text-sm text-zinc-500 mt-1">Control platform-wide settings without touching code. Changes apply instantly.</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Platform Access */}
                <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-danger-50 border border-red-100 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-danger-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900">Platform Access</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Control who can access the platform</p>
                        </div>
                    </div>
                    <ToggleRow
                        label="Maintenance Mode"
                        desc="When ON, all non-admin API traffic is blocked with a maintenance message."
                        configKey="maintenanceMode"
                        isChecked={config.maintenanceMode}
                        onToggle={handleToggle}
                    />
                </section>

                {/* Discovery Limits */}
                <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900">Discovery & Matching Limits</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Enforced directly on the matching API</p>
                        </div>
                    </div>
                    <NumberField label="Daily Like Limit" desc="Max likes any user can send per day." name="dailyLikeLimit" min={1} max={1000} unit="likes/day" value={config.dailyLikeLimit} onChange={handleChange} />
                    <NumberField label="Discovery Radius" desc="Default max search radius in kilometres." name="discoveryRadiusKm" min={1} max={500} unit="km" value={config.discoveryRadiusKm} onChange={handleChange} />
                    <NumberField label="Max Age Gap" desc="Maximum allowed age gap in years for matches." name="maxAgeGapYears" min={1} max={50} unit="years" value={config.maxAgeGapYears} onChange={handleChange} />
                </section>
            </div>
        </div>
    );
};

export default AppConfigPage;
