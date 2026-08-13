import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import { cropImageToSquare } from '../../../shared/utils/imageCrop';
import { devError } from '../../../shared/utils/logger';

const INTEREST_ICONS = {
    'Art & Crafts': '🎨',
    'Travelling': '🏔️',
    'Photography': '📷',
    'Cooking': '🍳',
    'Video Games': '🎮',
    'Music': '🎵',
    'Shopping': '🛍️',
    'Speeches': '🎙️',
    'Swimming': '🏊‍♂️',
    'Drinking': '🍹',
    'Extreme Sports': '🛹',
    'Fitness': '🏋️‍♂️',
};

const HEIGHT_OPTIONS = [];
for (let feet = 4; feet <= 10; feet++) {
    if (feet === 10) {
        HEIGHT_OPTIONS.push('10.0 Feet');
    } else {
        for (let inches = 0; inches < 12; inches++) {
            HEIGHT_OPTIONS.push(`${feet}.${inches} Feet`);
        }
    }
}

const getInterestIcon = (name) => INTEREST_ICONS[name] || '✨';

const DEFAULT_QUESTIONS = [
    { id: 1, question: 'My favorite way to do nothing is', answer: 'Nothing' },
    { id: 2, question: "I'll never forget the time I", answer: '12 PM' },
    { id: 3, question: 'The last note i wrote on my phone says', answer: '' },
];

const emptyProfile = {
    bio: '',
    profession: '',
    interests: [],
    education: '',
    religion: '',
    heightValue: '',
    heightUnit: 'Feet',
    languages: '',
    relationshipGoal: '',
    drinkingStatus: '',
    smokingStatus: '',
    profilePicture: '',
    galleryImages: [],
    selfiePhoto: '',
    selfieStatus: 'not_submitted',
    selfieRejectionReason: '',
    isVerified: false,
};

const EditProfilePage = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);
    const [form, setForm] = useState(emptyProfile);
    const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Modal state for editing questions / details
    const [activeModal, setActiveModal] = useState(null); // { type: 'question'|'detail', data: ... }
    const [modalInputValue, setModalInputValue] = useState('');

    const fileInputRef = useRef(null);
    const selfieInputRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                let currentUser = null;

                // 1. Fetch current logged-in user directly via /auth/me
                const meRes = await apiClient.get('/auth/me');
                if (meRes.ok && meRes.data?.success && meRes.data?.user) {
                    currentUser = meRes.data.user;
                } else {
                    const storedUserId =
                        sessionStorage.getItem('userId') ||
                        localStorage.getItem('userId') ||
                        JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}')._id ||
                        JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}').id;

                    if (storedUserId) {
                        const userRes = await apiClient.get(`/users/${storedUserId}`);
                        if (userRes.ok && userRes.data?.success && userRes.data?.user) {
                            currentUser = userRes.data.user;
                        }
                    }
                }

                if (!currentUser) {
                    setError('Could not load profile. Please log in again.');
                    setLoading(false);
                    return;
                }

                const u = currentUser;
                const activeId = u._id || u.id;
                setUserId(activeId);

                // Sync fresh active user & userId in storage
                sessionStorage.setItem('userId', activeId);
                localStorage.setItem('userId', activeId);
                sessionStorage.setItem('user', JSON.stringify(u));
                localStorage.setItem('user', JSON.stringify(u));

                setForm({
                    bio: u.bio || '',
                    profession: u.profession || '',
                    interests: u.interests || [],
                    education: u.education || '',
                    religion: u.religion || '',
                    heightValue: u.height?.value ? String(u.height.value) : '',
                    heightUnit: u.height?.unit || 'Feet',
                    languages: Array.isArray(u.languages) ? u.languages.join(', ') : (u.languages || ''),
                    relationshipGoal: u.relationshipGoal || '',
                    drinkingStatus: u.drinkingStatus || '',
                    smokingStatus: u.smokingStatus || '',
                    profilePicture: u.profilePicture || '',
                    galleryImages: u.galleryImages || [],
                    selfiePhoto: u.selfiePhoto || '',
                    selfieStatus: u.selfieStatus || 'not_submitted',
                    selfieRejectionReason: u.selfieRejectionReason || '',
                    isVerified: !!u.isVerified,
                });

                if (u.prompts && Array.isArray(u.prompts) && u.prompts.length > 0) {
                    // Always show the three fixed questions; only merge saved answers in.
                    setQuestions(
                        DEFAULT_QUESTIONS.map((dq) => {
                            const saved = u.prompts.find((p) => p.question === dq.question);
                            return saved ? { ...dq, answer: saved.answer || '' } : { ...dq };
                        })
                    );
                }
            } catch (err) {
                devError('Could not load user profile:', err);
                setError('Could not load profile data.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const toggleInterest = (name) => {
        setForm((prev) => ({
            ...prev,
            interests: prev.interests.includes(name)
                ? prev.interests.filter((i) => i !== name)
                : [...prev.interests, name],
        }));
    };

    const [uploadTarget, setUploadTarget] = useState(null);

    const handleProfileClick = () => {
        setUploadTarget('profile');
        fileInputRef.current?.click();
    };

    const handleGallerySlotClick = (idx) => {
        setUploadTarget({ type: 'gallery', index: idx });
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !userId) return;

        setUploading(true);
        try {
            const isMainPhotoSlot = uploadTarget === 'profile' || (!form.profilePicture && !uploadTarget);
            const croppedFile = await cropImageToSquare(file).catch(() => file);
            const formData = new FormData();

            if (isMainPhotoSlot) {
                formData.append('profilePicture', croppedFile);
                const { data, ok } = await apiClient.post(`/users/${userId}/profile-picture`, formData);
                if (ok && data.success) {
                    updateField('profilePicture', data.user.profilePicture);
                    if (data.user) {
                        sessionStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                }
            } else {
                formData.append('galleryImages', croppedFile);
                const { data, ok } = await apiClient.post(`/users/${userId}/gallery`, formData);
                if (ok && data.success) {
                    updateField('galleryImages', data.user.galleryImages);
                    if (data.user) {
                        sessionStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                }
            }
        } finally {
            setUploading(false);
            setUploadTarget(null);
        }
    };

    const handleSelfieClick = () => {
        if (form.selfieStatus === 'pending' || form.selfieStatus === 'approved') return;
        selfieInputRef.current?.click();
    };

    const handleSelfieUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !userId) return;

        setUploading(true);
        try {
            const croppedFile = await cropImageToSquare(file).catch(() => file);
            const formData = new FormData();
            formData.append('selfie', croppedFile);
            const { data, ok } = await apiClient.post(`/users/${userId}/selfie`, formData);
            if (ok && data.success && data.user) {
                updateField('selfiePhoto', data.user.selfiePhoto);
                updateField('selfieStatus', data.user.selfieStatus);
                updateField('selfieRejectionReason', data.user.selfieRejectionReason || '');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveGalleryImage = async (imageId) => {
        if (!userId) return;
        try {
            const { data, ok } = await apiClient.delete(`/users/${userId}/gallery/${imageId}`);
            if (ok && data.success) {
                updateField('galleryImages', data.user.galleryImages);
            } else {
                setError(data?.message || 'Could not remove photo. Please try again.');
            }
        } catch {
            setError('Could not remove photo. Please check your connection and try again.');
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        setError('');

        const payload = {
            bio: form.bio,
            profession: form.profession === 'Not specified' ? '' : form.profession,
            interests: form.interests,
            education: form.education === 'Not specified' ? '' : form.education,
            religion: form.religion === 'Not specified' ? '' : form.religion,
            languages: form.languages === 'Not specified' || !form.languages ? [] : [form.languages],
            relationshipGoal: form.relationshipGoal === 'Not specified' ? '' : form.relationshipGoal,
            drinkingStatus: form.drinkingStatus === 'Not specified' ? '' : form.drinkingStatus,
            smokingStatus: form.smokingStatus === 'Not specified' ? '' : form.smokingStatus,
            // Strip local-only fields like `id` — Mongoose rejects `id` on subdocuments.
            prompts: questions.map(({ question, answer }) => ({ question, answer })),
        };

        if (form.heightValue && form.heightValue !== 'Not specified') {
            const rawVal = String(form.heightValue).replace(' Feet', '').trim();
            const numVal = parseFloat(rawVal);
            if (!isNaN(numVal)) {
                payload.height = { value: numVal, unit: 'ft' };
            } else {
                payload.height = null;
            }
        } else {
            payload.height = null;
        }

        const targetId = userId || 'me';
        try {
            let res = await apiClient.put(`/users/${targetId}`, payload);
            if (!res.ok && targetId !== 'me') {
                res = await apiClient.put('/users/me', payload);
            }
            setSaving(false);
            const { data, ok } = res;

            if (ok && data.success) {
                // Refresh local user state
                if (data.user) {
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                navigate(-1);
            } else {
                setError(data.message || 'Could not save profile.');
            }
        } catch (err) {
            setSaving(false);
            setError('Error saving profile changes.');
        }
    };

    // Calculate dynamic strength %
    const calculateStrength = () => {
        let score = 0;
        const photosCount = (form.profilePicture ? 1 : 0) + (form.galleryImages?.length || 0);
        if (photosCount >= 1) score += 30;
        if (photosCount >= 4) score += 10;
        if (form.interests.length > 0) score += 20;
        const answeredQs = questions.filter((q) => q.answer && q.answer.trim().length > 0).length;
        if (answeredQs >= 1) score += 10;
        if (answeredQs >= 2) score += 10;
        if (form.bio.trim().length > 0) score += 10;
        if (form.education && form.religion) score += 10;

        return Math.min(100, score || 80);
    };

    const openQuestionModal = (idx) => {
        const q = questions[idx];
        setActiveModal({ type: 'question', idx, question: q.question, answer: q.answer || '' });
        setModalInputValue(q.answer || '');
    };

    const openDetailModal = (item) => {
        setActiveModal({ type: 'detail', key: item.key, label: item.label, options: item.options || [], placeholder: item.placeholder });
        setModalInputValue(item.value === 'Not specified' ? '' : (item.value || ''));
    };

    const saveModalData = () => {
        if (!activeModal) return;

        if (activeModal.type === 'question') {
            setQuestions((prev) => {
                const next = [...prev];
                next[activeModal.idx] = { ...next[activeModal.idx], answer: modalInputValue };
                return next;
            });
        } else if (activeModal.type === 'detail') {
            const valToSave = modalInputValue === 'Not specified' ? '' : modalInputValue;
            if (activeModal.key === 'heightValue') {
                const val = valToSave.replace(' Feet', '').trim();
                updateField('heightValue', val);
                updateField('heightUnit', 'Feet');
            } else {
                updateField(activeModal.key, valToSave);
            }
        }

        setActiveModal(null);
        setModalInputValue('');
    };

    if (loading) {
        return (
            <div className="h-[100dvh] flex items-center justify-center max-w-[414px] mx-auto" style={{ background: '#FCFCFC' }}>
                <div className="w-8 h-8 rounded-full border-4 border-[#F0EBFB] border-t-[#733FE0] animate-spin" />
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 max-w-[414px] mx-auto px-8 text-center" style={{ background: '#FCFCFC' }}>
                <p className="text-[15px] font-semibold text-gray-900">You need to be logged in to edit your profile.</p>
                <button
                    type="button"
                    onClick={() => navigate('/phone-input')}
                    className="px-5 py-2.5 rounded-full bg-[#733FE0] text-white text-[14px] font-bold cursor-pointer border-0"
                >
                    Go to login
                </button>
            </div>
        );
    }

    const isValidPhoto = (url) => url && typeof url === 'string' && !url.includes('wallet') && !url.includes('svg');

    const gallerySlots = [];
    const validGalleryImages = (form.galleryImages || [])
        .map((g) => ({
            url: typeof g === 'string' ? g : g?.url,
            id: typeof g === 'object' ? g._id || g.url : g,
        }))
        .filter((g) => isValidPhoto(g.url));

    for (let i = 0; i < 6; i++) {
        gallerySlots.push(validGalleryImages[i] || null);
    }

    const answeredQuestionsCount = questions.filter((q) => q.answer && q.answer.trim().length > 0).length;

    return (
        <div className="h-[100dvh] flex flex-col font-sans overflow-hidden max-w-[414px] mx-auto" style={{ background: '#FCFCFC' }}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
            <input ref={selfieInputRef} type="file" accept="image/*" capture="user" onChange={handleSelfieUpload} className="hidden" />

            {/* Header */}
            <header className="h-[52px] bg-[#FCFCFC] border-b border-gray-100 flex items-center justify-center px-4 relative shrink-0 shadow-2xs">
                <button
                    type="button"
                    aria-label="Back"
                    onClick={() => navigate(-1)}
                    className="absolute left-3 p-2 text-gray-700 hover:text-gray-900 cursor-pointer border-0 bg-transparent"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className="font-extrabold text-[17px] text-gray-900 tracking-tight">Edit</h1>
            </header>

            {/* Main Scrollable Content */}
            <main className="flex-1 overflow-y-auto px-4 pt-2 pb-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {error && (
                    <p className="text-[13px] font-semibold text-red-500 my-2 text-center">{error}</p>
                )}

                {/* Profile Photo */}
                <section className="bg-white rounded-[24px] p-4 shadow-2xs border border-gray-100/70 mt-3">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-[15px] text-gray-900">Profile Photo</h2>
                        {uploading && uploadTarget === 'profile' && (
                            <span className="text-[12px] font-semibold text-[#733FE0]">Uploading...</span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="relative aspect-square w-full">
                            {isValidPhoto(form.profilePicture) ? (
                                <div className="relative w-full h-full rounded-[20px] overflow-hidden border border-gray-100 shadow-2xs group">
                                    <img src={form.profilePicture} alt="Profile" className="w-full h-full object-cover" />

                                    {/* Edit / Replace Pencil Button */}
                                    <button
                                        type="button"
                                        onClick={handleProfileClick}
                                        className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[#733FE0] text-white flex items-center justify-center border border-white shadow-md cursor-pointer hover:bg-[#602ec3]"
                                        title="Change Profile Photo"
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleProfileClick}
                                    disabled={uploading}
                                    className="w-full h-full rounded-[20px] bg-gradient-to-b from-gray-50/90 to-purple-50/40 border border-gray-150 flex flex-col items-center justify-center cursor-pointer hover:border-purple-300 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#733FE0] text-white flex items-center justify-center shadow-xs">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 mt-1">Main Photo</span>
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Discovery Photos */}
                <section className="bg-white rounded-[24px] p-4 shadow-2xs border border-gray-100/70 mt-3.5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-[15px] text-gray-900">Discovery Photos</h2>
                        {uploading && uploadTarget && uploadTarget !== 'profile' && (
                            <span className="text-[12px] font-semibold text-[#733FE0]">Uploading...</span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {gallerySlots.map((slot, idx) => (
                            <div key={idx} className="relative aspect-square w-full">
                                {slot?.url ? (
                                    <div className="relative w-full h-full rounded-[20px] overflow-hidden border border-gray-100 shadow-2xs group">
                                        <img src={slot.url} alt="" className="w-full h-full object-cover" />

                                        {/* Edit / Replace Pencil Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleGallerySlotClick(idx)}
                                            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[#733FE0] text-white flex items-center justify-center border border-white shadow-md cursor-pointer hover:bg-[#602ec3]"
                                            title="Edit / Replace Photo"
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>

                                        {/* Delete button for gallery photos */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveGalleryImage(slot.id)}
                                            className="absolute top-1.5 right-1.5 w-5.5 h-5.5 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] border-0 cursor-pointer hover:bg-black"
                                            title="Remove Photo"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleGallerySlotClick(idx)}
                                        disabled={uploading}
                                        className="w-full h-full rounded-[20px] bg-gradient-to-b from-gray-50/90 to-purple-50/40 border border-gray-150 flex flex-col items-center justify-center cursor-pointer hover:border-purple-300 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-[#733FE0] text-white flex items-center justify-center shadow-xs">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19" />
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                        </div>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <p className="text-[11.5px] font-normal text-gray-400 mt-2.5 px-0.5">
                        At least 1 photo is required — add up to 6 to boost your profile
                    </p>
                </section>

                {/* Verified Your Photos */}
                <section
                    onClick={handleSelfieClick}
                    className={`bg-white rounded-[20px] p-3.5 px-4 shadow-2xs border border-gray-100/70 mt-3.5 flex items-center justify-between transition-colors ${form.selfieStatus === 'pending' || form.selfieStatus === 'approved' ? '' : 'cursor-pointer hover:border-purple-200'}`}
                >
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[14.5px] text-gray-900 tracking-tight">Verify Your Photos</span>
                            {form.selfieStatus === 'approved' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#22C55E" className="shrink-0">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M9 12l2 2 4-4" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                            )}
                        </div>
                        <span className="text-[11.5px] font-medium text-gray-400">
                            {form.selfieStatus === 'approved' && 'Verified'}
                            {form.selfieStatus === 'pending' && 'Submitted — under review'}
                            {form.selfieStatus === 'rejected' && (form.selfieRejectionReason || 'Rejected — tap to resubmit')}
                            {(!form.selfieStatus || form.selfieStatus === 'not_submitted') && 'Not verified yet'}
                        </span>
                    </div>

                    {form.selfieStatus !== 'pending' && form.selfieStatus !== 'approved' && (
                        <div className="w-7 h-7 rounded-full bg-purple-50 text-[#733FE0] flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    )}
                </section>

                {/* Profile Strength */}
                <section className="mt-4 px-0.5">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-[14.5px] text-gray-900">
                            Profile Strength: <span className="font-black text-gray-900">{calculateStrength()}%</span>
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-gray-200/70 overflow-hidden">
                        <div
                            className="h-full bg-[#733FE0] rounded-full transition-all duration-500"
                            style={{ width: `${calculateStrength()}%` }}
                        />
                    </div>

                    {/* Checklist */}
                    <div className="flex items-center gap-4 mt-3 text-[12.5px] font-semibold flex-wrap">
                        <div className="flex items-center gap-1.5 text-gray-900">
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                            Photos added
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-900">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${answeredQuestionsCount >= 2 ? 'bg-emerald-500' : 'bg-gray-300'}`}>✓</span>
                            {answeredQuestionsCount} Questions answered
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-900">
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                            Add interests
                        </div>
                    </div>
                </section>

                {/* Basic info */}
                <section className="mt-5">
                    <h3 className="font-bold text-[15px] text-gray-900 mb-2 px-0.5">Basic info</h3>
                    <div className="bg-[#F7F7FA] border border-gray-200/60 rounded-[20px] p-3.5 relative">
                        <textarea
                            value={form.bio}
                            onChange={(e) => updateField('bio', e.target.value.slice(0, 250))}
                            placeholder="Write something that shows who you really are..."
                            maxLength={250}
                            className="w-full h-[72px] bg-transparent border-0 outline-none resize-none font-medium text-[13px] text-gray-900 placeholder:text-gray-400"
                        />
                        <div className="text-right text-[10.5px] font-semibold text-gray-400 mt-1">
                            {form.bio.length}/250
                        </div>
                    </div>
                </section>

                {/* Questions */}
                <section className="mt-5">
                    <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                        <h3 className="font-bold text-[15px] text-gray-900">Questions</h3>
                        <span className="text-gray-400 text-[11.5px] font-medium">( Answer at least 2 to stand out )</span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {questions.map((q, idx) => (
                            <div
                                key={q.id || idx}
                                className="bg-white rounded-[20px] p-3.5 px-4 shadow-2xs border border-gray-100/70 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-[13.5px] text-gray-900 leading-tight tracking-tight">
                                        {q.question}
                                    </p>
                                    <p className="text-[12px] text-gray-400 font-medium mt-1 truncate">
                                        {q.answer || 'Not answered yet'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openQuestionModal(idx)}
                                    className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#733FE0] text-white text-[12px] font-extrabold flex items-center gap-1 shadow-xs hover:bg-[#602ec3] cursor-pointer border-0 active:scale-95 transition-all"
                                >
                                    Edit
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* My interests */}
                <section className="mt-5">
                    <h3 className="font-bold text-[15px] text-gray-900 mb-2 px-0.5">My interests</h3>
                    <div className="bg-white rounded-[20px] p-4 shadow-2xs border border-gray-100/70 flex flex-wrap items-center gap-2">
                        {form.interests.map((interest) => (
                            <div
                                key={interest}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-150 text-[12.5px] font-semibold text-gray-800"
                            >
                                <span>{getInterestIcon(interest)}</span>
                                <span>{interest}</span>
                                <button
                                    type="button"
                                    onClick={() => toggleInterest(interest)}
                                    className="ml-1 text-gray-400 hover:text-red-500 font-bold border-0 bg-transparent cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                localStorage.setItem('onboarding_interests:v1', JSON.stringify(form.interests));
                                navigate('/interests', { state: { from: '/edit-profile' } });
                            }}
                            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#733FE0] text-white text-[12.5px] font-extrabold shadow-xs hover:bg-[#602ec3] cursor-pointer border-0 active:scale-95 transition-all"
                        >
                            <span className="text-base leading-none">+</span> Add interest
                        </button>
                    </div>
                </section>

                {/* Details */}
                <section className="mt-5">
                    <h3 className="font-bold text-[15px] text-gray-900 mb-2.5 px-0.5">Details</h3>
                    <div className="flex flex-col gap-2.5">
                        {[
                            { key: 'profession', label: 'Work / Post', value: form.profession || 'Not specified', placeholder: 'e.g. Interior Designer at Company' },
                            { key: 'education', label: 'Education', value: form.education || 'Not specified', options: ['Not specified', 'Graduate', 'Post Graduate', 'Undergraduate', 'High School'] },
                            { key: 'religion', label: 'Religious beliefs', value: form.religion || 'Not specified', options: ['Not specified', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Atheist', 'Other'] },
                            { key: 'heightValue', label: 'Height', value: form.heightValue ? (form.heightValue.includes('Feet') ? form.heightValue : `${form.heightValue} Feet`) : 'Not specified', options: ['Not specified', ...HEIGHT_OPTIONS] },
                            { key: 'languages', label: 'My Languages', value: form.languages || 'Not specified', options: ['Not specified', 'English', 'Hindi', 'Bengali', 'Punjabi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu'] },
                            { key: 'relationshipGoal', label: 'Dating intentions', value: form.relationshipGoal || 'Not specified', options: ['Not specified', 'Long-term', 'Short-term', 'New friends', 'Casual'] },
                        ].map((item) => (
                            <div
                                key={item.key}
                                onClick={() => openDetailModal(item)}
                                className="bg-white rounded-[20px] p-3.5 px-4 shadow-2xs border border-gray-100/70 flex items-center justify-between cursor-pointer hover:border-purple-200 transition-colors"
                            >
                                <span className="font-bold text-[13.5px] text-gray-900">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12.5px] font-medium text-gray-500">{item.value}</span>
                                    <div className="w-6 h-6 rounded-full bg-purple-50 text-[#733FE0] flex items-center justify-center shrink-0">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Habits */}
                <section className="mt-5">
                    <h3 className="font-bold text-[15px] text-gray-900 mb-2.5 px-0.5">Habits</h3>
                    <div className="flex flex-col gap-2.5">
                        {[
                            { key: 'drinkingStatus', label: 'Drinking', value: form.drinkingStatus || 'Not specified', options: ['Not specified', 'No', 'Yes', 'Occasionally', 'Socially'] },
                            { key: 'smokingStatus', label: 'Smoking', value: form.smokingStatus || 'Not specified', options: ['Not specified', 'No', 'Yes', 'Occasionally', 'Socially'] },
                        ].map((item) => (
                            <div
                                key={item.key}
                                onClick={() => openDetailModal(item)}
                                className="bg-white rounded-[20px] p-3.5 px-4 shadow-2xs border border-gray-100/70 flex items-center justify-between cursor-pointer hover:border-purple-200 transition-colors"
                            >
                                <span className="font-bold text-[13.5px] text-gray-900">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12.5px] font-medium text-gray-500">{item.value}</span>
                                    <div className="w-6 h-6 rounded-full bg-purple-50 text-[#733FE0] flex items-center justify-center shrink-0">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Save Changes Button */}
                <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full h-[54px] rounded-full bg-[#733FE0] text-white font-extrabold text-[16px] shadow-md shadow-purple-200 hover:bg-[#602ec3] active:scale-[0.98] transition-all cursor-pointer border-0 mt-8 mb-8 flex items-center justify-center uppercase tracking-wide"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </main>

            {/* Interactive Edit Modal (Full Page Screen) */}
            {activeModal && (
                <div className="fixed inset-0 z-50 bg-[#FAFAFD] flex flex-col justify-between max-w-[414px] mx-auto animate-in slide-in-from-bottom duration-200 select-none">
                    {/* Header Bar */}
                    <div className="w-full bg-white rounded-b-[24px] px-4 py-3.5 shadow-2xs flex items-center justify-between relative shrink-0">
                        <h3 className="font-bold text-[18px] text-gray-900 mx-auto text-center pl-8">
                            {activeModal.type === 'question'
                                ? 'Fill the promts'
                                : activeModal.label}
                        </h3>
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={() => setActiveModal(null)}
                            className="w-9 h-9 rounded-full bg-[#F3EAFF] hover:bg-[#EADBFF] text-[#703DE2] flex items-center justify-center transition-colors cursor-pointer border-0 shrink-0"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Modal Body Content */}
                    <div className="flex-1 p-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col justify-start">
                        {activeModal.type === 'question' ? (
                            <>
                                <div className="w-full bg-white rounded-[20px] p-4 border border-gray-100/90 shadow-2xs flex items-center justify-between mb-3 mt-1">
                                    <span className="font-bold text-[14px] text-gray-900 pr-2">{activeModal.question}</span>
                                </div>
                                <div className="w-full bg-[#F4F4F7] rounded-[20px] p-4 border border-gray-200/50 mb-4 min-h-[140px] flex flex-col">
                                    <textarea
                                        rows={5}
                                        value={modalInputValue}
                                        onChange={(e) => setModalInputValue(e.target.value)}
                                        placeholder="Type your answer here..."
                                        className="w-full h-full bg-transparent border-0 outline-none resize-none font-medium text-[13.5px] text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                            </>
                        ) : activeModal.key === 'heightValue' ? (
                            <div className="flex flex-col items-center justify-center gap-3 my-auto py-8 max-h-[360px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full">
                                {activeModal.options.map((opt) => {
                                    const cleanOpt = opt.replace(' Feet', '').trim();
                                    const cleanVal = modalInputValue.replace(' Feet', '').trim();
                                    const isSel = cleanVal === cleanOpt;
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setModalInputValue(opt)}
                                            className={`w-[85%] text-center transition-all cursor-pointer rounded-full ${
                                                isSel
                                                    ? 'bg-[#F3EAFF] border border-[#D9C4FF] text-[#703DE2] font-extrabold text-[18px] py-2.5 shadow-2xs'
                                                    : 'text-gray-400 hover:text-gray-600 font-medium text-[15px] py-1.5 bg-transparent border-0'
                                            }`}
                                        >
                                            {opt.includes('Feet') ? opt : `${opt} Feet`}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : activeModal.options && activeModal.options.length > 0 ? (
                            <div className="flex flex-col gap-3 my-2 pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full">
                                {activeModal.options.map((opt) => {
                                    const isSel = modalInputValue === opt;
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setModalInputValue(opt)}
                                            className="w-full bg-white rounded-full py-4 px-6 border border-gray-100 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-purple-200 active:scale-[0.99] border-0"
                                        >
                                            <span className="font-bold text-[14px] text-gray-900">{opt}</span>
                                            {isSel ? (
                                                <div className="w-5 h-5 rounded-full border-2 border-[#703DE2] flex items-center justify-center shrink-0">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#703DE2]" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-[#EFE8FF] shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="w-full bg-[#F4F4F7] rounded-[20px] p-4 border border-gray-200/50 my-2">
                                <input
                                    type="text"
                                    value={modalInputValue}
                                    onChange={(e) => setModalInputValue(e.target.value)}
                                    placeholder={activeModal.placeholder || "Enter details..."}
                                    className="w-full bg-transparent border-0 outline-none font-medium text-[14px] text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        )}
                    </div>

                    {/* Modal Bottom Footer Bar */}
                    <div className="w-full p-4 flex items-center justify-end shrink-0 bg-transparent">
                        <button
                            type="button"
                            onClick={saveModalData}
                            className="w-12 h-12 rounded-full bg-[#703DE2] hover:bg-[#602ec3] text-white flex items-center justify-center shadow-lg shadow-purple-300/80 active:scale-95 transition-all border-0 cursor-pointer ml-auto shrink-0"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditProfilePage;
