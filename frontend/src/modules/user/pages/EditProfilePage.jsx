import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import { cropImageToSquare } from '../../../shared/utils/imageCrop';
import { devError } from '../../../shared/utils/logger';
import { calculateProfileStrength } from '../../../shared/utils/profileStrength';

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
for (let feet = 3; feet <= 10; feet++) {
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
    { id: 1, question: 'My favorite way to do nothing is', answer: '' },
    { id: 2, question: "I'll never forget the time I", answer: '' },
    { id: 3, question: 'The last note i wrote on my phone says', answer: '' },
];

const emptyProfile = {
    gender: '',
    interestedIn: '',
    bio: '',
    profession: '',
    company: '',
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
    const [activeModal, setActiveModal] = useState(null); // { type: 'question'|'detail'|'work'|'gender', data: ... }
    const [modalInputValue, setModalInputValue] = useState('');
    const [modalPost, setModalPost] = useState('');
    const [modalCompany, setModalCompany] = useState('');
    const [modalGender, setModalGender] = useState('Male');
    const [modalInterestedIn, setModalInterestedIn] = useState(['Female']);

    const toggleModalInterest = (gender) => {
        if (modalInterestedIn.includes(gender)) {
            if (modalInterestedIn.length > 1) {
                setModalInterestedIn(modalInterestedIn.filter((g) => g !== gender));
            }
        } else {
            setModalInterestedIn([...modalInterestedIn, gender]);
        }
    };

    const fileInputRef = useRef(null);
    const heightContainerRef = useRef(null);
    const selectedHeightRef = useRef(null);

    useEffect(() => {
        if (activeModal?.key === 'heightValue') {
            setTimeout(() => {
                if (selectedHeightRef.current) {
                    selectedHeightRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
                } else if (heightContainerRef.current) {
                    heightContainerRef.current.scrollTop = 0;
                }
            }, 30);
        }
    }, [activeModal]);

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

                let initialProfession = u.profession || '';
                let initialCompany = u.company || '';
                if (!initialCompany && initialProfession.includes(' at ')) {
                    const parts = initialProfession.split(' at ');
                    if (parts.length === 2) {
                        initialProfession = parts[0].trim();
                        initialCompany = parts[1].trim();
                    }
                }

                let userGender = '';
                if (u.gender) {
                    userGender = u.gender.charAt(0).toUpperCase() + u.gender.slice(1).toLowerCase();
                } else {
                    try {
                        const gData = JSON.parse(localStorage.getItem('onboarding_gender:v1') || '{}');
                        if (gData.userGender) {
                            userGender = gData.userGender.charAt(0).toUpperCase() + gData.userGender.slice(1).toLowerCase();
                        }
                    } catch { }
                }

                let userInterestedIn = '';
                if (u.interestedIn) {
                    if (Array.isArray(u.interestedIn)) {
                        if (u.interestedIn.includes('both') || (u.interestedIn.includes('male') && u.interestedIn.includes('female'))) {
                            userInterestedIn = 'Both';
                        } else if (u.interestedIn.includes('male')) {
                            userInterestedIn = 'Male';
                        } else if (u.interestedIn.includes('female')) {
                            userInterestedIn = 'Female';
                        }
                    } else if (typeof u.interestedIn === 'string') {
                        const lower = u.interestedIn.toLowerCase();
                        if (lower === 'both') userInterestedIn = 'Both';
                        else if (lower === 'male') userInterestedIn = 'Male';
                        else if (lower === 'female') userInterestedIn = 'Female';
                    }
                }
                if (!userInterestedIn) {
                    try {
                        const gData = JSON.parse(localStorage.getItem('onboarding_gender:v1') || '{}');
                        if (Array.isArray(gData.interestedIn)) {
                            if (gData.interestedIn.length > 1 || gData.interestedIn.includes('Both') || gData.interestedIn.includes('both')) {
                                userInterestedIn = 'Both';
                            } else if (gData.interestedIn.length === 1) {
                                userInterestedIn = gData.interestedIn[0];
                            }
                        }
                    } catch { }
                }

                setForm({
                    gender: userGender,
                    interestedIn: userInterestedIn,
                    bio: u.bio || '',
                    profession: initialProfession,
                    company: initialCompany,
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

    const handleSelfieClick = () => {
        if (form.selfieStatus === 'approved' || form.isVerified) return;
        navigate('/selfie-verification', { state: { from: '/edit-profile' } });
    };

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

    const persistProfile = async (newForm, newQuestions) => {
        if (!userId) return null;
        const currentForm = newForm || form;
        const currentQuestions = newQuestions || questions;

        let interestedInPayload = [];
        if (currentForm.interestedIn && currentForm.interestedIn !== 'Not specified') {
            if (currentForm.interestedIn === 'Both' || currentForm.interestedIn === 'both') {
                interestedInPayload = ['male', 'female', 'both'];
            } else if (currentForm.interestedIn === 'Male' || currentForm.interestedIn === 'male') {
                interestedInPayload = ['male'];
            } else if (currentForm.interestedIn === 'Female' || currentForm.interestedIn === 'female') {
                interestedInPayload = ['female'];
            } else if (Array.isArray(currentForm.interestedIn)) {
                interestedInPayload = currentForm.interestedIn.map(i => String(i).toLowerCase());
            }
        }

        const payload = {
            gender: currentForm.gender && currentForm.gender !== 'Not specified' ? currentForm.gender.toLowerCase() : '',
            interestedIn: interestedInPayload,
            bio: currentForm.bio,
            profession: currentForm.profession === 'Not specified' ? '' : currentForm.profession,
            company: currentForm.company === 'Not specified' ? '' : currentForm.company,
            interests: currentForm.interests,
            education: currentForm.education === 'Not specified' ? '' : currentForm.education,
            religion: currentForm.religion === 'Not specified' ? '' : currentForm.religion,
            languages: currentForm.languages === 'Not specified' || !currentForm.languages ? [] : (Array.isArray(currentForm.languages) ? currentForm.languages : [currentForm.languages]),
            relationshipGoal: currentForm.relationshipGoal === 'Not specified' ? '' : currentForm.relationshipGoal,
            drinkingStatus: currentForm.drinkingStatus === 'Not specified' ? '' : currentForm.drinkingStatus,
            smokingStatus: currentForm.smokingStatus === 'Not specified' ? '' : currentForm.smokingStatus,
            // Strip local-only fields like `id` — Mongoose rejects `id` on subdocuments.
            prompts: currentQuestions.map(({ question, answer }) => ({ question, answer })),
        };

        if (currentForm.heightValue && currentForm.heightValue !== 'Not specified') {
            const rawVal = String(currentForm.heightValue).replace(' Feet', '').trim();
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
            if (res.ok && res.data?.success && res.data?.user) {
                sessionStorage.setItem('user', JSON.stringify(res.data.user));
                localStorage.setItem('user', JSON.stringify(res.data.user));
            }
            if ((currentForm.gender && currentForm.gender !== 'Not specified') || currentForm.interestedIn) {
                try {
                    const gData = JSON.parse(localStorage.getItem('onboarding_gender:v1') || '{}');
                    if (currentForm.gender && currentForm.gender !== 'Not specified') {
                        gData.userGender = currentForm.gender;
                    }
                    if (currentForm.interestedIn && currentForm.interestedIn !== 'Not specified') {
                        if (currentForm.interestedIn === 'Both') {
                            gData.interestedIn = ['Male', 'Female'];
                        } else {
                            gData.interestedIn = [currentForm.interestedIn];
                        }
                    }
                    localStorage.setItem('onboarding_gender:v1', JSON.stringify(gData));
                } catch { }
            }
            return res;
        } catch (err) {
            devError('Autosave profile failed:', err);
            return null;
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        setError('');

        try {
            const res = await persistProfile(form, questions);
            setSaving(false);

            if (res && res.ok) {
                navigate(-1);
            } else {
                setError(res?.data?.message || 'Could not save profile.');
            }
        } catch (err) {
            setSaving(false);
            setError('Error saving profile changes.');
        }
    };

    const answeredQuestionsCount = questions.filter((q) => q.answer && q.answer.trim().length > 0).length;
    const hasPhotos = (form.profilePicture ? 1 : 0) + (form.galleryImages?.length || 0) >= 1;
    const hasInterests = form.interests && form.interests.length > 0;

    // Calculate dynamic strength %
    const calculateStrength = () => calculateProfileStrength({
        profilePicture: form.profilePicture,
        galleryImages: form.galleryImages,
        interests: form.interests,
        prompts: questions,
        bio: form.bio,
        education: form.education,
        religion: form.religion,
        profession: form.profession,
        company: form.company,
    });

    const openQuestionModal = (idx) => {
        const q = questions[idx];
        setActiveModal({ type: 'question', idx, question: q.question, answer: q.answer || '' });
        setModalInputValue(q.answer || '');
    };

    const openDetailModal = (item) => {
        if (item.key === 'work' || item.key === 'profession') {
            setActiveModal({ type: 'work', key: 'work', label: 'Work' });
            setModalPost(form.profession === 'Not specified' ? '' : (form.profession || ''));
            setModalCompany(form.company === 'Not specified' ? '' : (form.company || ''));
            return;
        }
        if (item.key === 'gender') {
            setActiveModal({ type: 'gender', key: 'gender', label: 'Gender' });
            setModalGender(form.gender || 'Male');
            setModalInterestedIn(
                form.interestedIn === 'Both'
                    ? ['Male', 'Female']
                    : (form.interestedIn ? [form.interestedIn] : ['Female'])
            );
            return;
        }
        setActiveModal({ type: 'detail', key: item.key, label: item.label, options: item.options || [], placeholder: item.placeholder });
        setModalInputValue(item.value === 'Not specified' ? '' : (item.value || ''));
    };

    const saveModalData = async () => {
        if (!activeModal) return;

        let nextForm = { ...form };
        let nextQuestions = [...questions];

        if (activeModal.type === 'gender' || activeModal.key === 'gender') {
            const finalInterestedIn = modalInterestedIn.length > 1 ? 'Both' : (modalInterestedIn[0] || 'Both');
            nextForm = {
                ...nextForm,
                gender: modalGender,
                interestedIn: finalInterestedIn,
            };
            setForm(nextForm);
        } else if (activeModal.type === 'work' || activeModal.key === 'work') {
            nextForm = {
                ...nextForm,
                profession: modalPost.trim(),
                company: modalCompany.trim(),
            };
            setForm(nextForm);
        } else if (activeModal.type === 'question') {
            nextQuestions = questions.map((q, i) =>
                i === activeModal.idx ? { ...q, answer: modalInputValue } : q
            );
            setQuestions(nextQuestions);
        } else if (activeModal.type === 'detail') {
            const valToSave = modalInputValue === 'Not specified' ? '' : modalInputValue;
            if (activeModal.key === 'heightValue') {
                const val = valToSave.replace(' Feet', '').trim();
                nextForm = {
                    ...nextForm,
                    heightValue: val,
                    heightUnit: 'Feet',
                };
            } else {
                nextForm = {
                    ...nextForm,
                    [activeModal.key]: valToSave,
                };
            }
            setForm(nextForm);
        }

        setActiveModal(null);
        setModalInputValue('');
        setModalPost('');
        setModalCompany('');

        // End-to-end autosave to database immediately
        persistProfile(nextForm, nextQuestions);
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


    return (
        <div className="h-[100dvh] flex flex-col font-sans overflow-hidden max-w-[414px] mx-auto" style={{ background: '#FCFCFC' }}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />

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
                    className={`bg-white rounded-[20px] p-3.5 px-4 shadow-2xs border border-gray-100/70 mt-3.5 flex items-center justify-between transition-colors ${(form.selfieStatus === 'approved' || form.isVerified) ? '' : 'cursor-pointer hover:border-purple-200 active:scale-[0.99]'}`}
                >
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[14.5px] text-gray-900 tracking-tight">Verify Your Photos</span>
                            {(form.selfieStatus === 'approved' || form.isVerified) && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#22C55E" className="shrink-0">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M9 12l2 2 4-4" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                            )}
                        </div>
                        <span className="text-[11.5px] font-medium text-gray-400">
                            {(form.selfieStatus === 'approved' || form.isVerified) && 'Verified'}
                            {form.selfieStatus === 'pending' && !form.isVerified && 'Submitted — under review'}
                            {form.selfieStatus === 'rejected' && !form.isVerified && (form.selfieRejectionReason || 'Rejected — tap to resubmit')}
                            {(!form.selfieStatus || form.selfieStatus === 'not_submitted') && !form.isVerified && 'Not verified yet'}
                        </span>
                    </div>

                    {form.selfieStatus !== 'approved' && !form.isVerified && (
                        <div className="w-7 h-7 rounded-full bg-purple-50 text-[#733FE0] flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
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
                            <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-bold ${hasPhotos ? 'bg-emerald-500' : 'bg-gray-300'}`}>✓</span>
                            Photos added
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-900">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${answeredQuestionsCount >= 2 ? 'bg-emerald-500' : 'bg-gray-300'}`}>✓</span>
                            2 Questions answered
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-900">
                            <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-bold ${hasInterests ? 'bg-emerald-500' : 'bg-gray-300'}`}>✓</span>
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
                            { key: 'gender', label: 'Gender', value: form.gender || 'Not specified' },
                            {
                                key: 'work',
                                label: 'Work',
                                value: form.profession && form.company
                                    ? `${form.profession} at ${form.company}`
                                    : form.profession || form.company || 'Not specified',
                            },
                            { key: 'education', label: 'Education', value: form.education || 'Not specified', options: ['High School', 'Undergraduate', 'Graduate', 'Post Graduate'] },
                            { key: 'religion', label: 'Religious beliefs', value: form.religion || 'Not specified', options: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Atheist'] },
                            { key: 'heightValue', label: 'Height', value: form.heightValue ? (form.heightValue.includes('Feet') ? form.heightValue : `${form.heightValue} Feet`) : 'Not specified', options: HEIGHT_OPTIONS },
                            { key: 'languages', label: 'My Languages', value: form.languages || 'Not specified', options: ['English', 'Hindi', 'Bengali', 'Punjabi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu'] },
                            { key: 'relationshipGoal', label: 'Dating intentions', value: form.relationshipGoal || 'Not specified', options: ['Long Term', 'Casual'] },
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
                            { key: 'drinkingStatus', label: 'Drinking', value: form.drinkingStatus || 'Not specified', options: ['No', 'Yes', 'Occasionally', 'Socially'] },
                            { key: 'smokingStatus', label: 'Smoking', value: form.smokingStatus || 'Not specified', options: ['No', 'Yes', 'Occasionally', 'Socially'] },
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
                    <div className="w-full bg-white rounded-b-[24px] px-4 py-4 shadow-2xs flex items-center justify-center relative shrink-0">
                        <h3 className="font-bold text-[18px] text-gray-900 text-center">
                            {activeModal.type === 'question'
                                ? 'Fill the promts'
                                : activeModal.label}
                        </h3>
                    </div>

                    {/* Modal Body Content */}
                    <div className="flex-1 p-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col justify-start">
                        {activeModal.type === 'gender' || activeModal.key === 'gender' ? (
                            <div className="flex flex-col gap-6 my-2 w-full">
                                {/* Section 1: Your Gender */}
                                <div>
                                    <h4 className="text-[14px] font-bold text-gray-900 mb-0.5">Your Gender</h4>
                                    <p className="text-[11px] text-gray-400 font-normal mb-3">Select the option that describes you</p>
                                    <div className="flex space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setModalGender('Male')}
                                            className={`flex-1 flex items-center px-2 h-[52px] rounded-full transition-all cursor-pointer ${
                                                modalGender === 'Male'
                                                    ? 'bg-[#F3EAFF] border-2 border-[#6E36E4] shadow-xs'
                                                    : 'bg-white border-[1.5px] border-gray-200 hover:border-[#C7B5FB]'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-1 ${
                                                modalGender === 'Male' ? 'bg-[#6E36E4] text-white' : 'bg-[#F2EDFD] text-[#6E36E4]'
                                            }`}>
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM9.5 8a2 2 0 00-2 2v5a1 1 0 001 1h1v6a1 1 0 001 1h3a1 1 0 001-1v-6h1a1 1 0 001-1v-5a2 2 0 00-2-2h-5z" />
                                                </svg>
                                            </div>
                                            <span className={`flex-1 text-center text-[14px] pr-2 ${
                                                modalGender === 'Male' ? 'font-bold text-[#6E36E4]' : 'font-semibold text-gray-600'
                                            }`}>
                                                Male
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setModalGender('Female')}
                                            className={`flex-1 flex items-center px-2 h-[52px] rounded-full transition-all cursor-pointer ${
                                                modalGender === 'Female'
                                                    ? 'bg-[#F3EAFF] border-2 border-[#6E36E4] shadow-xs'
                                                    : 'bg-white border-[1.5px] border-gray-200 hover:border-[#C7B5FB]'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-1 ${
                                                modalGender === 'Female' ? 'bg-[#6E36E4] text-white' : 'bg-[#F2EDFD] text-[#6E36E4]'
                                            }`}>
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8.5 8a2 2 0 00-2 2v4a1 1 0 001 1h1v7a1 1 0 001 1h7a1 1 0 001-1v-7h1a1 1 0 001-1v-4a2 2 0 00-2-2h-7z" />
                                                </svg>
                                            </div>
                                            <span className={`flex-1 text-center text-[14px] pr-2 ${
                                                modalGender === 'Female' ? 'font-bold text-[#6E36E4]' : 'font-semibold text-gray-600'
                                            }`}>
                                                Female
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Section 2: Who are you interested in */}
                                <div>
                                    <h4 className="text-[14px] font-bold text-gray-900 mb-0.5">Who are you interested in?</h4>
                                    <p className="text-[11px] text-gray-400 font-normal mb-3">Select one or more</p>
                                    <div className="flex space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleModalInterest('Male')}
                                            className={`flex-1 flex items-center px-2 h-[52px] rounded-full transition-all cursor-pointer ${
                                                modalInterestedIn.includes('Male')
                                                    ? 'bg-[#F3EAFF] border-2 border-[#6E36E4] shadow-xs'
                                                    : 'bg-white border-[1.5px] border-gray-200 hover:border-[#C7B5FB]'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-1 ${
                                                modalInterestedIn.includes('Male') ? 'bg-[#6E36E4] text-white' : 'bg-[#F2EDFD] text-[#6E36E4]'
                                            }`}>
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM9.5 8a2 2 0 00-2 2v5a1 1 0 001 1h1v6a1 1 0 001 1h3a1 1 0 001-1v-6h1a1 1 0 001-1v-5a2 2 0 00-2-2h-5z" />
                                                </svg>
                                            </div>
                                            <span className={`flex-1 text-center text-[14px] pr-2 ${
                                                modalInterestedIn.includes('Male') ? 'font-bold text-[#6E36E4]' : 'font-semibold text-gray-600'
                                            }`}>
                                                Male
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => toggleModalInterest('Female')}
                                            className={`flex-1 flex items-center px-2 h-[52px] rounded-full transition-all cursor-pointer ${
                                                modalInterestedIn.includes('Female')
                                                    ? 'bg-[#F3EAFF] border-2 border-[#6E36E4] shadow-xs'
                                                    : 'bg-white border-[1.5px] border-gray-200 hover:border-[#C7B5FB]'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-1 ${
                                                modalInterestedIn.includes('Female') ? 'bg-[#6E36E4] text-white' : 'bg-[#F2EDFD] text-[#6E36E4]'
                                            }`}>
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8.5 8a2 2 0 00-2 2v4a1 1 0 001 1h1v7a1 1 0 001 1h7a1 1 0 001-1v-7h1a1 1 0 001-1v-4a2 2 0 00-2-2h-7z" />
                                                </svg>
                                            </div>
                                            <span className={`flex-1 text-center text-[14px] pr-2 ${
                                                modalInterestedIn.includes('Female') ? 'font-bold text-[#6E36E4]' : 'font-semibold text-gray-600'
                                            }`}>
                                                Female
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : activeModal.type === 'work' || activeModal.key === 'work' ? (
                            <div className="flex flex-col gap-3.5 my-2 w-full">
                                <div className="w-full bg-white rounded-[20px] p-4 border-[1.5px] border-[#D1C2F7] focus-within:border-[#703DE2] shadow-2xs transition-all">
                                    <input
                                        type="text"
                                        value={modalPost}
                                        onChange={(e) => setModalPost(e.target.value)}
                                        placeholder="Post"
                                        className="w-full bg-transparent border-0 outline-none font-medium text-[14px] text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                                <div className="w-full bg-white rounded-[20px] p-4 border-[1.5px] border-[#D1C2F7] focus-within:border-[#703DE2] shadow-2xs transition-all">
                                    <input
                                        type="text"
                                        value={modalCompany}
                                        onChange={(e) => setModalCompany(e.target.value)}
                                        placeholder="Company name"
                                        className="w-full bg-transparent border-0 outline-none font-medium text-[14px] text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                        ) : activeModal.type === 'question' ? (
                            <>
                                <div className="w-full bg-white rounded-[20px] p-4 border border-gray-100/90 shadow-2xs flex items-center justify-between mb-3 mt-1">
                                    <span className="font-bold text-[14px] text-gray-900 pr-2">{activeModal.question}</span>
                                </div>
                                <div className="w-full bg-white rounded-[20px] p-4 border-[1.5px] border-[#D1C2F7] focus-within:border-[#703DE2] shadow-2xs mb-4 min-h-[140px] flex flex-col transition-all">
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
                            <div
                                ref={heightContainerRef}
                                className="flex flex-col items-center justify-start gap-2.5 mt-16 pt-2 pb-16 w-full flex-1 max-h-[340px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            >
                                {activeModal.options.map((opt) => {
                                    const cleanOpt = opt.replace(' Feet', '').trim();
                                    const cleanVal = modalInputValue.replace(' Feet', '').trim();
                                    const isSel = cleanVal === cleanOpt;
                                    return (
                                        <button
                                            key={opt}
                                            ref={isSel ? selectedHeightRef : null}
                                            type="button"
                                            onClick={() => setModalInputValue(opt)}
                                            className={`w-[85%] text-center transition-all cursor-pointer rounded-full shrink-0 ${
                                                isSel
                                                    ? 'bg-[#F3EAFF] border-[1.5px] border-[#703DE2] text-[#703DE2] font-extrabold text-[18px] py-2.5 shadow-2xs'
                                                    : 'text-gray-500 hover:text-gray-900 font-medium text-[15px] py-2 bg-transparent hover:bg-purple-50/50 border-0'
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
                                            className={`w-full bg-white rounded-full py-4 px-6 shadow-2xs flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                                                isSel
                                                    ? 'border-[1.5px] border-[#703DE2] bg-[#FAF8FF]'
                                                    : 'border-[1.5px] border-[#D1C2F7] hover:border-[#703DE2]'
                                            }`}
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
                            <div className="w-full bg-white rounded-[20px] p-4 border-[1.5px] border-[#D1C2F7] focus-within:border-[#703DE2] shadow-2xs my-2 transition-all">
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
                    <div className="w-full px-6 pt-2 pb-16 mb-4 flex items-center justify-end shrink-0 bg-transparent">
                        <button
                            type="button"
                            onClick={saveModalData}
                            className="w-13 h-13 rounded-full bg-[#703DE2] hover:bg-[#602ec3] text-white flex items-center justify-center shadow-lg shadow-purple-300/80 active:scale-95 transition-all border-0 cursor-pointer ml-auto shrink-0"
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
