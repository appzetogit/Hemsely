import React, { useState, useEffect } from 'react';
import { Smartphone, Save, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';
import adminApi from '../services/adminApi';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';

const AppLinksPage = () => {
    const [playStoreUrl, setPlayStoreUrl] = useState('');
    const [appStoreUrl, setAppStoreUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copiedField, setCopiedField] = useState(null);

    useEffect(() => {
        let isMounted = true;
        adminApi.get('/admin/app-config')
            .then(({ data, ok }) => {
                if (!isMounted) return;
                if (ok && data.success && data.config) {
                    setPlayStoreUrl(data.config.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.hemsely');
                    setAppStoreUrl(data.config.appStoreUrl || 'https://apps.apple.com/app/hemsely/id000000000');
                }
            })
            .catch(() => {
                if (isMounted) setErrorMessage('Could not load current links from server.');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSave = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrorMessage('');
        setSaveSuccess(false);

        try {
            const { data, ok } = await adminApi.put('/admin/app-config', {
                playStoreUrl: playStoreUrl.trim(),
                appStoreUrl: appStoreUrl.trim(),
            });

            if (ok && data.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3500);
            } else {
                setErrorMessage(data?.message || 'Failed to update app links.');
            }
        } catch {
            setErrorMessage('Network error while saving app links. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-zinc-200">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2.5">
                        <Smartphone className="w-7 h-7 text-brand-600" />
                        App Download Links
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Configure dynamic Google Play Store and Apple App Store links. Updated links reflect immediately on the Landing Page.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : saveSuccess ? 'Saved Successfully!' : 'Save Links'}
                    </Button>
                </div>
            </div>

            {/* Status alerts */}
            {saveSuccess && (
                <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-in fade-in">
                    <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>App download links updated! The Landing Page now uses these links dynamically.</span>
                </div>
            )}

            {errorMessage && (
                <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Links Editor Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Google Play Store Card */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl">
                                    🤖
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-900">Google Play Store (Android)</h2>
                                    <p className="text-xs text-zinc-500">Target package: com.hemsely</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                Android APK
                            </span>
                        </div>

                        <div className="mt-5 space-y-2">
                            <label htmlFor="play-store-url" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 block">
                                Play Store Download Link
                            </label>
                            <Input
                                id="play-store-url"
                                type="url"
                                placeholder="https://play.google.com/store/apps/details?id=com.hemsely"
                                value={playStoreUrl}
                                onChange={(e) => setPlayStoreUrl(e.target.value)}
                                className="w-full text-sm font-medium"
                            />
                            <p className="text-xs text-zinc-400">
                                Enter the full Google Play link or direct APK hosted URL.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => handleCopy(playStoreUrl, 'play')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-100"
                        >
                            {copiedField === 'play' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedField === 'play' ? 'Copied' : 'Copy Link'}
                        </button>
                        <a
                            href={playStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors py-1.5 px-3 rounded-lg hover:bg-brand-50"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Test Link
                        </a>
                    </div>
                </div>

                {/* Apple App Store Card */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl">
                                    🍏
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-900">Apple App Store (iOS)</h2>
                                    <p className="text-xs text-zinc-500">iOS App Store URL or TestFlight</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                                Apple iOS
                            </span>
                        </div>

                        <div className="mt-5 space-y-2">
                            <label htmlFor="app-store-url" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 block">
                                App Store Download Link
                            </label>
                            <Input
                                id="app-store-url"
                                type="url"
                                placeholder="https://apps.apple.com/app/hemsely/id000000000"
                                value={appStoreUrl}
                                onChange={(e) => setAppStoreUrl(e.target.value)}
                                className="w-full text-sm font-medium"
                            />
                            <p className="text-xs text-zinc-400">
                                Enter the Apple App Store listing or public TestFlight link.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => handleCopy(appStoreUrl, 'apple')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-100"
                        >
                            {copiedField === 'apple' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedField === 'apple' ? 'Copied' : 'Copy Link'}
                        </button>
                        <a
                            href={appStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors py-1.5 px-3 rounded-lg hover:bg-brand-50"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Test Link
                        </a>
                    </div>
                </div>
            </div>

            {/* Live Preview on Landing Page */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-6 sm:p-8 text-white border border-white/10 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Live Preview</span>
                        <h3 className="text-lg font-bold text-white mt-0.5">Landing Page Download Buttons</h3>
                        <p className="text-xs text-zinc-400 mt-1">This is how your visitors see and interact with these links on the web.</p>
                    </div>
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-300 hover:text-brand-200 transition-colors bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Live Landing Page
                    </a>
                </div>

                <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
                    {/* Google Play Button Preview */}
                    <a
                        href={playStoreUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700/90 text-white px-5 py-3 rounded-xl border border-white/15 transition-all shadow-md active:scale-95"
                    >
                        <svg className="w-6 h-6 fill-current text-white shrink-0" viewBox="0 0 24 24">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a2.023 2.023 0 0 1-1.11-1.786V3.6a2.023 2.023 0 0 1 1.109-1.786zm11.606 11.611l2.42 2.42-12.75 7.362 10.33-9.782zm0-2.85L4.885.793l12.75 7.362-2.42 2.42zm1.43 1.425l3.896 2.25a1.88 1.88 0 0 0 0-3.26l-3.896 2.25z" />
                        </svg>
                        <div className="text-left">
                            <p className="text-[10px] uppercase font-semibold text-zinc-400 leading-none">GET IT ON</p>
                            <p className="text-sm font-bold text-white leading-tight mt-0.5">Google Play</p>
                        </div>
                    </a>

                    {/* App Store Button Preview */}
                    <a
                        href={appStoreUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700/90 text-white px-5 py-3 rounded-xl border border-white/15 transition-all shadow-md active:scale-95"
                    >
                        <svg className="w-6 h-6 fill-current text-white shrink-0" viewBox="0 0 24 24">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.36-.56.65-.96 1.7-0.85 2.73 1.02.08 2.05-.51 2.58-1.24z" />
                        </svg>
                        <div className="text-left">
                            <p className="text-[10px] uppercase font-semibold text-zinc-400 leading-none">Download on the</p>
                            <p className="text-sm font-bold text-white leading-tight mt-0.5">App Store</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AppLinksPage;

