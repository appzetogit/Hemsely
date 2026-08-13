import React, { useEffect, useState } from 'react';
import { Zap, IndianRupee, Save, CheckCircle2, ShieldAlert } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const BoostEditPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [boostPrice1, setBoostPrice1] = useState(199);
    const [boostPrice5, setBoostPrice5] = useState(399);
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const { data, ok } = await adminApi.get('/admin/app-config');
                if (ok && data?.config) {
                    if (data.config.boostPrice1 !== undefined) setBoostPrice1(data.config.boostPrice1);
                    if (data.config.boostPrice5 !== undefined) setBoostPrice5(data.config.boostPrice5);
                } else {
                    setFeedback({ type: 'error', message: data?.message || 'Failed to load boost pricing details.' });
                }
            } catch (err) {
                setFeedback({ type: 'error', message: 'Failed to load boost pricing details.' });
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFeedback(null);

        const price1 = Number(boostPrice1);
        const price5 = Number(boostPrice5);

        if (isNaN(price1) || price1 < 1 || isNaN(price5) || price5 < 1) {
            setFeedback({ type: 'error', message: 'Please enter valid positive numbers for boost prices.' });
            setSaving(false);
            return;
        }

        try {
            const { data, ok } = await adminApi.put('/admin/app-config', {
                boostPrice1: price1,
                boostPrice5: price5,
            });

            if (ok && data?.success) {
                setFeedback({ type: 'success', message: 'Boost plan prices updated successfully!' });
            } else {
                setFeedback({ type: 'error', message: data?.message || 'Failed to update boost prices.' });
            }
        } catch (err) {
            setFeedback({ type: 'error', message: 'Failed to communicate with server.' });
        } finally {
            setSaving(false);
        }
    };



    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2.5">
                        <Zap className="w-6 h-6 text-amber-500 fill-amber-500/20" /> Boost Edit
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Configure and update pricing for 1 Boost and 5 Boosts packages for all users.
                    </p>
                </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
                <div
                    className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Boost Pricing Form */}
            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: 1 Boost Package */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Zap className="w-5 h-5 fill-amber-500/30" />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black uppercase tracking-wider">
                                    1 Boost
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900">1 Profile Boost</h3>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                Single boost package giving 20x higher visibility for 3 days.
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100">
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                                Price (₹ INR)
                            </label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    type="number"
                                    min="1"
                                    required
                                    value={boostPrice1}
                                    onChange={(e) => setBoostPrice1(e.target.value)}
                                    className="pl-9 text-base font-bold text-zinc-900"
                                    placeholder="199"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 2: 5 Boosts Package */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-colors">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Zap className="w-5 h-5 fill-orange-500/30" />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-black uppercase tracking-wider">
                                    5 Boosts
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900">5 Profile Boosts</h3>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                Value pack of 5 profile boosts for maximum discovery reach.
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100">
                            <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                                Price (₹ INR)
                            </label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    type="number"
                                    min="1"
                                    required
                                    value={boostPrice5}
                                    onChange={(e) => setBoostPrice5(e.target.value)}
                                    className="pl-9 text-base font-bold text-zinc-900"
                                    placeholder="399"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        disabled={saving || loading}
                        className="bg-[#703DE2] hover:bg-[#602ec3] text-white px-6 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Boost Prices'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default BoostEditPage;
