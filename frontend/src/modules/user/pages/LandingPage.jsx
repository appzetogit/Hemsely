import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Heart,
    ShieldCheck,
    Sparkles,
    Star,
    Lock
} from 'lucide-react';
import apiClient from '../../../shared/services/apiClient';

const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.hemsely';
const DEFAULT_APP_STORE_URL = 'https://apps.apple.com/app/hemsely/id000000000';

const LandingPage = () => {
    const [playStoreUrl, setPlayStoreUrl] = useState(DEFAULT_PLAY_STORE_URL);
    const [appStoreUrl, setAppStoreUrl] = useState(DEFAULT_APP_STORE_URL);
    const [supportEmail, setSupportEmail] = useState('');

    useEffect(() => {
        let isMounted = true;
        apiClient.get('/public/app-links')
            .then(({ data, ok }) => {
                if (!isMounted) return;
                if (ok && data?.success) {
                    if (data.playStoreUrl) setPlayStoreUrl(data.playStoreUrl);
                    if (data.appStoreUrl) setAppStoreUrl(data.appStoreUrl);
                    if (data.supportEmail) setSupportEmail(data.supportEmail);
                }
            })
            .catch(() => {
                // Fallback to defaults
            });
        return () => { isMounted = false; };
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-purple-100 selection:text-purple-900 flex flex-col justify-between">
            {/* Clean Navigation Header (Brand Only) */}
            <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6F3BCE] to-[#9060EF] flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                            <Heart className="w-5 h-5 fill-white stroke-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-slate-950 font-sans">
                            Hemsely
                        </span>
                    </div>
                </div>
            </header>

            {/* Centered Hero Section (No Phone Photo) */}
            <main className="flex-1 flex items-center justify-center relative overflow-hidden py-16 lg:py-24 bg-gradient-to-b from-purple-50/50 via-white to-slate-50">
                {/* Background decorative glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-200/35 rounded-full blur-3xl pointer-events-none -z-10" />
                <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-pink-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
                <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-indigo-200/25 rounded-full blur-3xl pointer-events-none -z-10" />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight leading-[1.12]">
                        Find Meaningful Connections, Made for <span className="bg-gradient-to-r from-[#6F3BCE] via-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">Real Love.</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
                        Say goodbye to fake profiles and surface-level swiping. Hemsely brings you authentic singles verified through facial recognition AI, shared core values, and deep relationship goals.
                    </p>

                    {/* Download Buttons */}
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                        {/* Google Play Button */}
                        <a
                            href={playStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex items-center justify-center gap-3.5 bg-slate-950 hover:bg-slate-800 text-white px-7 py-4 rounded-2xl shadow-xl shadow-slate-950/20 border border-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <svg className="w-8 h-8 fill-current shrink-0 text-white" viewBox="0 0 24 24">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a2.023 2.023 0 0 1-1.11-1.786V3.6a2.023 2.023 0 0 1 1.109-1.786zm11.606 11.611l2.42 2.42-12.75 7.362 10.33-9.782zm0-2.85L4.885.793l12.75 7.362-2.42 2.42zm1.43 1.425l3.896 2.25a1.88 1.88 0 0 0 0-3.26l-3.896 2.25z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider leading-none">GET IT ON</p>
                                <p className="text-lg font-bold text-white leading-tight mt-0.5">Google Play</p>
                            </div>
                        </a>

                        {/* Apple App Store Button */}
                        <a
                            href={appStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex items-center justify-center gap-3.5 bg-slate-950 hover:bg-slate-800 text-white px-7 py-4 rounded-2xl shadow-xl shadow-slate-950/20 border border-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <svg className="w-8 h-8 fill-current shrink-0 text-white" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.36-.56.65-.96 1.7-0.85 2.73 1.02.08 2.05-.51 2.58-1.24z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider leading-none">Download on the</p>
                                <p className="text-lg font-bold text-white leading-tight mt-0.5">App Store</p>
                            </div>
                        </a>
                    </div>
                </div>
            </main>

            {/* Compact Footer */}
            <footer className="w-full bg-white border-t border-slate-200 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#6F3BCE] flex items-center justify-center text-white">
                            <Heart className="w-3.5 h-3.5 fill-white" />
                        </div>
                        <span className="font-extrabold text-base text-slate-900">Hemsely</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 font-medium">
                        <Link to="/privacy-policy" className="hover:text-[#6F3BCE] transition-colors">
                            Privacy Policy
                        </Link>
                        <Link to="/terms-of-service" className="hover:text-[#6F3BCE] transition-colors">
                            Terms of Service
                        </Link>
                        <Link to="/child-safety" className="hover:text-[#6F3BCE] transition-colors">
                            Child Safety
                        </Link>
                        <Link to="/delete-account" className="hover:text-[#6F3BCE] transition-colors">
                            Delete Account
                        </Link>
                        {supportEmail && (
                            <a href={`mailto:${supportEmail}`} className="hover:text-[#6F3BCE] transition-colors">
                                {supportEmail}
                            </a>
                        )}
                    </div>

                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} Hemsely. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
