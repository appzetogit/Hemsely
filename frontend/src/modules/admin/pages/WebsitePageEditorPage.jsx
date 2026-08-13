import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Save, Edit3, Check } from 'lucide-react';
import { websitePagesBySlug } from '../constants/websitePages';
import adminApi from '../services/adminApi';

const WebsitePageEditorPage = () => {
    const { slug } = useParams();
    const staticMeta = websitePagesBySlug[slug];

    const [page, setPage] = useState(null);
    const [lastSavedPage, setLastSavedPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!staticMeta) return;
        setLoading(true);
        setLoadError('');
        setIsEditing(false);
        adminApi.get(`/admin/website-pages/${slug}`).then(({ data, ok }) => {
            if (ok && data.success) {
                const loaded = {
                    title: data.page.title === slug ? staticMeta.title : data.page.title,
                    summary: data.page.summary || staticMeta.description,
                    body: data.page.body || '',
                };
                setPage(loaded);
                setLastSavedPage(loaded);
            } else {
                setLoadError(data?.message || 'Could not load this page.');
            }
            setLoading(false);
        }).catch(() => {
            setLoadError('Could not load this page. Please try again.');
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

    const handleCancel = () => {
        setPage(lastSavedPage);
        setIsEditing(false);
        setSaveError('');
    };

    const handleAction = async () => {
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        setSaving(true);
        setSaveError('');
        try {
            const { data, ok } = await adminApi.put(`/admin/website-pages/${slug}`, page);
            if (ok && data.success) {
                // The server sanitizes `body` (strips disallowed tags) before saving -
                // sync that back so the editor reflects what was actually persisted,
                // rather than the admin's raw, possibly-stripped input.
                const saved_ = {
                    title: data.page.title === slug ? staticMeta.title : data.page.title,
                    summary: data.page.summary || staticMeta.description,
                    body: data.page.body || '',
                };
                setPage(saved_);
                setLastSavedPage(saved_);
                setSaved(true);
                setIsEditing(false);
                window.setTimeout(() => setSaved(false), 2500);
            } else {
                setSaveError(data?.message || 'Could not save this page.');
            }
        } catch {
            setSaveError('Could not save this page. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const pageData = page || {
        title: staticMeta.title,
        summary: staticMeta.description,
        body: '',
    };

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

                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors shadow-sm cursor-pointer hover:bg-zinc-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleAction}
                            disabled={saving || loading}
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
                </div>

                {saveError && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {saveError}
                    </div>
                )}

                {loadError && !page && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {loadError}
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label htmlFor="editor-title" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Page Title
                        </label>
                        <input
                            id="editor-title"
                            type="text"
                            value={pageData.title}
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
                            value={pageData.summary}
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
                            value={pageData.body}
                            readOnly={!isEditing}
                            onChange={(e) => updateField('body', e.target.value)}
                            className={`w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-4 text-sm leading-6 text-zinc-900 outline-none transition-colors ${
                                isEditing
                                    ? 'focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                                    : 'bg-zinc-50 cursor-default border-transparent'
                            }`}
                            placeholder={`Add content for ${staticMeta.title}`}
                        />
                        <p className="mt-2 text-xs text-zinc-400">
                            This is saved as HTML shown directly to visitors. Only these tags are kept: paragraphs, line breaks, bold, italic, underline, lists, headings, quotes, and links — anything else (including scripts) is stripped on save.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default WebsitePageEditorPage;
