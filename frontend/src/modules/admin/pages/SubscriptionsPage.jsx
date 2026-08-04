import React, { useEffect, useState } from 'react';
import { CheckCircle2, Crown, IndianRupee, Sparkles, Layers, Pencil, Save, X, Lock, Plus, Trash2 } from 'lucide-react';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const PlanCard = ({ plan, onSavePlan }) => {
    const [editing, setEditing] = useState(false);
    const [price, setPrice] = useState(plan.price);
    const [description, setDescription] = useState(plan.description || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const ok = await onSavePlan(plan, {
            price: Number(price),
            description: description.trim(),
        });
        setSaving(false);
        if (ok) setEditing(false);
    };

    const handleCancel = () => {
        setEditing(false);
        setPrice(plan.price);
        setDescription(plan.description || '');
    };

    return (
        <article className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-zinc-900">{plan.name}</h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 text-zinc-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        <Lock className="w-3 h-3" /> Static
                    </span>
                </div>

                {editing ? (
                    <div className="mt-2 space-y-4 flex-1 flex flex-col">
                        <div>
                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Description</label>
                            <Input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Plan description..."
                                className="text-xs py-1.5"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Price (₹)</label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="pl-9 text-xs py-1.5"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-100 flex-1 flex flex-col">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                <span>Included Features (Fixed)</span>
                                <Lock className="w-3 h-3 text-zinc-400" />
                            </label>
                            <div className="space-y-2">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs font-medium text-zinc-500">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 mt-auto">
                            <Button size="sm" disabled={saving} onClick={handleSave} className="flex-1">
                                <Save className="w-3.5 h-3.5" /> Save Plan
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancel}>
                                <X className="w-3.5 h-3.5" /> Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-xs text-zinc-500 mb-4">{plan.description}</p>

                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl font-extrabold text-zinc-900">₹{plan.price}</span>
                            <span className="text-sm text-zinc-500">/ {plan.durationDays} days</span>
                            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditing(true)}>
                                <Pencil className="w-3.5 h-3.5" /> Edit Price
                            </Button>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-zinc-100 flex-1">
                            {plan.features.map((feature, idx) => (
                                <div key={`${idx}-${feature.slice(0, 20)}`} className="flex items-start gap-2 text-xs font-medium text-zinc-600">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </article>
    );
};

const SubscriptionsPage = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        adminApi.get('/admin/subscriptions/plans').then(({ data, ok }) => {
            if (ok && data.success) {
                setPlans(data.plans);
            } else {
                setLoadError(data?.message || 'Could not load subscription plans.');
            }
            setLoading(false);
        }).catch(() => {
            setLoadError('Could not load subscription plans. Please try again.');
            setLoading(false);
        });
    }, []);

    const handleSavePlan = async (plan, payload) => {
        if (!payload.price || payload.price <= 0) {
            setMessage('Price must be a positive number.');
            return false;
        }
        try {
            const { data, ok } = await adminApi.patch(`/admin/subscriptions/plans/${plan._id}`, payload);
            if (ok && data.success) {
                setPlans((prev) => prev.map((p) => (p._id === plan._id ? data.plan : p)));
                setMessage(`${plan.name} updated successfully.`);
                setTimeout(() => setMessage(''), 2500);
                return true;
            }
            setMessage(data.message || 'Could not update plan.');
            return false;
        } catch {
            setMessage('Could not update plan. Please try again.');
            return false;
        }
    };

    if (loading) return <PageSpinner />;

    if (loadError && plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <p className="text-sm font-semibold text-zinc-700">{loadError}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Subscriptions</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Manage pricing, descriptions, and feature bullet points for subscription plans.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-blue-50 ring-1 ring-blue-100/50 flex items-center justify-center mr-3.5">
                        <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Static Plans</p>
                        <h3 className="text-xl font-medium text-zinc-900 tracking-tight leading-none">{plans.length}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center">
                    <div className="p-2.5 rounded-lg bg-amber-50 ring-1 ring-amber-100/50 flex items-center justify-center mr-3.5">
                        <Crown className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Active Plans</p>
                        <h3 className="text-xl font-medium text-zinc-900 tracking-tight leading-none">{plans.filter((p) => p.isActive).length}</h3>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.includes('updated') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className={plans.length === 1 ? "max-w-lg mx-auto w-full" : "grid grid-cols-1 md:grid-cols-3 gap-4"}>
                {plans.map((plan) => (
                    <PlanCard key={plan._id} plan={plan} onSavePlan={handleSavePlan} />
                ))}
            </div>
        </div>
    );
};

export default SubscriptionsPage;
