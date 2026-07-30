import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';

const TermsOfServicePage = () => {
    const navigate = useNavigate();
    const [pageData, setPageData] = useState({ title: 'Terms of Service', summary: '', body: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/pages/terms-of-service').then(({ data, ok }) => {
            if (ok && data.success && data.page) {
                setPageData({
                    title: data.page.title || 'Terms of Service',
                    summary: data.page.summary || '',
                    body: data.page.body || '',
                });
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    return (
        <div className="h-screen bg-[#FCFCFC] flex flex-col max-w-[414px] mx-auto overflow-hidden">
            {/* Header */}
            <header className="relative flex items-center justify-between px-4 shrink-0 bg-[#FCFCFC] shadow-xs" style={{ height: '52px', borderRadius: '0px 0px 14px 14px' }}>
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '10px',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <h1 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#000',
                    opacity: 0.9
                }}>
                    {pageData.title}
                </h1>

                <div className="w-[44px]" />
            </header>

            <main className="flex-1 overflow-y-auto px-6 pt-8 pb-10">
                <h2 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: '24px',
                    lineHeight: '30px',
                    color: '#000000',
                    marginBottom: '16px'
                }}>
                    {pageData.title}
                </h2>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-7 h-7 rounded-full border-3 border-[#F0EBFB] border-t-[#6F3BCE] animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {pageData.summary && (
                            <p style={{
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 600,
                                fontSize: '16px',
                                lineHeight: '22px',
                                color: '#333333',
                                marginBottom: '8px'
                            }}>
                                {pageData.summary}
                            </p>
                        )}

                        {pageData.body ? (
                            <div
                                className="whitespace-pre-wrap leading-relaxed text-sm text-black"
                                style={{ fontFamily: "'Inter', sans-serif" }}
                                dangerouslySetInnerHTML={{ __html: pageData.body }}
                            />
                        ) : (
                            <div className="py-12 text-center text-gray-400 text-sm">
                                No terms of service content published yet.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default TermsOfServicePage;
