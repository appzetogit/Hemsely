import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Save, Edit3, Check } from 'lucide-react';
import { websitePagesBySlug } from '../constants/websitePages';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';

const WebsitePageEditorPage = () => {
    const { slug } = useParams();
    const staticMeta = websitePagesBySlug[slug];

    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!staticMeta) return;
        setLoading(true);
        setIsEditing(false);
        adminApi.get(`/admin/website-pages/${slug}`).then(({ data, ok }) => {
            if (ok && data.success) {
                setPage({
                    title: data.page.title === slug ? staticMeta.title : data.page.title,
                    summary: data.page.summary || staticMeta.description,
                    body: data.page.body || '',
                });
            }
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    if (!staticMeta) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    const updateField = (field, value) => {
        setPage((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleAction = async () => {
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        setSaving(true);
        const { data, ok } = await adminApi.put(`/admin/website-pages/${slug}`, page);
        setSaving(false);

        if (ok && data.success) {
            setSaved(true);
            setIsEditing(false);
            window.setTimeout(() => setSaved(false), 2500);
        }
    };

    if (loading || !page) return <PageSpinner />;

    return (
        <div className="w-full max-w-5xl mx-auto">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-4 border-b border-zinc-100 pb-5 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-2xl font-medium tracking-tight text-zinc-900">{staticMeta.title}</h1>
                        <p className="mt-1 text-sm text-zinc-500">
                            {isEditing ? 'Currently editing page content.' : 'View or edit the content for this page.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleAction}
                        disabled={saving}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-colors shadow-sm cursor-pointer disabled:opacity-60 ${
                            saved
                                ? 'bg-success-600 hover:bg-success-600'
                                : isEditing
                                    ? 'bg-brand-600 hover:bg-brand-700'
                                    : 'bg-zinc-900 hover:bg-black'
                        }`}
                    >
                        {saved ? (
                            <>
                                <Check className="h-4 w-4" />
                                Saved
                            </>
                        ) : isEditing ? (
                            <>
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : 'Save Content'}
                            </>
                        ) : (
                            <>
                                <Edit3 className="h-4 w-4" />
                                Edit Content
                            </>
                        )}
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label htmlFor="editor-title" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Page Title
                        </label>
                        <input
                            id="editor-title"
                            type="text"
                            value={page.title}
                            readOnly={!isEditing}
                            onChange={(e) => updateField('title', e.target.value)}
                            className={`w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-colors ${
                                isEditing
                                    ? 'focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                                    : 'bg-zinc-50 cursor-default border-transparent'
                            }`}
                            placeholder="Enter page title"
                        />
                    </div>

                    <div>
                        <label htmlFor="editor-summary" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Short Description
                        </label>
                        <input
                            id="editor-summary"
                            type="text"
                            value={page.summary}
                            readOnly={!isEditing}
                            onChange={(e) => updateField('summary', e.target.value)}
                            className={`w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-colors ${
                                isEditing
                                    ? 'focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                                    : 'bg-zinc-50 cursor-default border-transparent'
                            }`}
                            placeholder="Enter short description"
                        />
                    </div>

                    <div>
                        <label htmlFor="editor-content" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Page Content
                        </label>
                        <textarea
                            id="editor-content"
                            rows={16}
                            value={page.body}
                            readOnly={!isEditing}
                            onChange={(e) => updateField('body', e.target.value)}
                            className={`w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-4 text-sm leading-6 text-zinc-900 outline-none transition-colors ${
                                isEditing
                                    ? 'focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                                    : 'bg-zinc-50 cursor-default border-transparent'
                            }`}
                            placeholder={`Add content for ${staticMeta.title}`}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default WebsitePageEditorPage;
