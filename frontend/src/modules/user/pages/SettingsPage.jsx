import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import checkMarkIcon from '../assets/icons/tick.png';
import { deleteUserProfile, updateUserProfile } from '../services/userApi';
import apiClient from '../../../shared/services/apiClient';
import { devError } from '../../../shared/utils/logger';

const SectionHeader = ({ title }) => (
    <div style={{ padding: '16px 15px 8px', opacity: 0.7 }}>
        <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: '14px',
            color: '#000',
            textAlign: 'left'
        }}>
            {title}
        </h2>
    </div>
);

const Toggle = ({ active, onToggle, label }) => (
    <button
        type="button"
        aria-label={label || "Toggle setting"}
        aria-pressed={active}
        onClick={(e) => {
            e.stopPropagation();
            onToggle();
        }}
        style={{
            width: '46px',
            height: '24px',
            background: active ? '#733FE0' : '#E9E9E9',
            borderRadius: '12px',
            position: 'relative',
            transition: 'background-color 0.3s ease',
            border: 'none',
            cursor: 'pointer'
        }}
    >
        <div style={{
            width: '24px',
            height: '24px',
            background: active ? '#FFFFFF' : '#939393',
            borderRadius: '12px',
            position: 'absolute',
            top: 0,
            left: active ? '22px' : '0px',
            transition: 'left 0.3s ease, background-color 0.3s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
    </button>
);

const SettingRow = ({ label, value, subtext, showCheck, showArrow, badge, onClick, children }) => {
    const Component = onClick ? 'button' : 'div';
    const compProps = onClick ? { type: 'button', onClick, className: 'w-full text-left border-0 bg-transparent p-0 cursor-pointer' } : {};

    return (
        <div className="mb-3">
            <Component
                {...compProps}
                style={{
                    width: '385px',
                    maxWidth: '92vw',
                    minHeight: subtext ? '62px' : '50px',
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.04)',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 15px'
                }}
            >
                <div style={{ textAlign: 'left', flex: 1 }}>
                    <div className="flex items-center gap-2">
                        <span style={{
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 500,
                            fontSize: '14px',
                            color: '#000'
                        }}>
                            {label}
                        </span>
                        {badge && (
                            <div style={{
                                padding: '3px 10px',
                                background: '#FF7C67',
                                borderRadius: '10px',
                                color: '#FFF',
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 600,
                                fontSize: '11px'
                            }}>
                                {badge}
                            </div>
                        )}
                    </div>
                    {subtext && (
                        <p style={{
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 500,
                            fontSize: '10px',
                            color: '#000',
                            opacity: 0.4,
                            marginTop: '2px'
                        }}>
                            {subtext}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {value && (
                        <span style={{
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 500,
                            fontSize: '13.5px',
                            color: '#000',
                            opacity: 0.7
                        }}>
                            {value}
                        </span>
                    )}
                    {showCheck && <img src={checkMarkIcon} alt="check" style={{ width: '16px', height: '16px' }} />}
                    {showArrow && (
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                            <path d="M1 1L5 5L1 9" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                    {children}
                </div>
            </Component>
        </div>
    );
};

const SettingsPage = () => {
    const navigate = useNavigate();
    const [isPaused, setIsPaused] = useState(false);
    const [showActiveStatus, setShowActiveStatus] = useState(true);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('Not added');
    const [isDeleting, setIsDeleting] = useState(false);

    // Email Modal state
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);

    // Blocked Accounts state
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loadingBlocked, setLoadingBlocked] = useState(false);
    const [unblockingId, setUnblockingId] = useState(null);

    const fetchBlockedUsers = async () => {
        const uId = localStorage.getItem('userId');
        if (!uId) return;
        setLoadingBlocked(true);
        try {
            const { data, ok } = await apiClient.get(`/users/${uId}/blocked`);
            if (ok && data?.blockedUsers) {
                setBlockedUsers(data.blockedUsers);
            }
        } catch (err) {
            devError('Failed to fetch blocked users:', err);
        } finally {
            setLoadingBlocked(false);
        }
    };

    const handleOpenBlockedModal = () => {
        setShowBlockedModal(true);
        fetchBlockedUsers();
    };

    const handleUnblockUser = async (blockedUserId) => {
        const uId = localStorage.getItem('userId');
        if (!uId) return;
        setUnblockingId(blockedUserId);
        try {
            const { ok, data } = await apiClient.post(`/users/${uId}/unblock/${blockedUserId}`);
            if (ok) {
                setBlockedUsers((prev) => prev.filter((u) => (u._id || u.id) !== blockedUserId));
            } else {
                alert(data?.message || 'Failed to unblock user.');
            }
        } catch (err) {
            devError('Error unblocking user:', err);
            alert('Failed to unblock user.');
        } finally {
            setUnblockingId(null);
        }
    };

    useEffect(() => {
        const loadUserData = async () => {
            try {
                const userId = localStorage.getItem('userId');
                const userObjStr = localStorage.getItem('user');
                let userObj = {};
                if (userObjStr) {
                    try { userObj = JSON.parse(userObjStr); } catch { }
                }

                if (userObj.phoneNumber) {
                    setPhoneNumber(userObj.phoneNumber);
                } else if (localStorage.getItem('user_phone')) {
                    setPhoneNumber(localStorage.getItem('user_phone'));
                } else {
                    setPhoneNumber('+91 76104 16911');
                }

                if (userObj.email) {
                    setEmail(userObj.email);
                    setEmailInput(userObj.email);
                }

                const res = await apiClient.get('/users/me');
                if (res.ok && res.data?.user) {
                    const fetchedUser = res.data.user;
                    if (fetchedUser._id) {
                        localStorage.setItem('userId', fetchedUser._id);
                    }
                    if (fetchedUser.phoneNumber) setPhoneNumber(fetchedUser.phoneNumber);
                    if (fetchedUser.email) {
                        setEmail(fetchedUser.email);
                        setEmailInput(fetchedUser.email);
                    }
                    if (typeof fetchedUser.isPaused === 'boolean') {
                        setIsPaused(fetchedUser.isPaused);
                    } else if (typeof fetchedUser.isActive === 'boolean') {
                        setIsPaused(!fetchedUser.isActive);
                    }
                    if (typeof fetchedUser.showActiveStatus === 'boolean') setShowActiveStatus(fetchedUser.showActiveStatus);

                    const uId = fetchedUser._id || userId;
                    if (uId) {
                        try {
                            const bRes = await apiClient.get(`/users/${uId}/blocked`);
                            if (bRes.ok && bRes.data?.blockedUsers) {
                                setBlockedUsers(bRes.data.blockedUsers);
                            }
                        } catch { }
                    }
                }
            } catch (err) {
                devError('Error loading settings user profile:', err);
            }
        };

        loadUserData();
    }, []);

    const handleSaveEmail = async (e) => {
        e.preventDefault();
        const trimmedEmail = emailInput.trim();
        if (!trimmedEmail) {
            alert("Please enter a valid email address");
            return;
        }

        setSavingEmail(true);
        try {
            await updateUserProfile('me', { email: trimmedEmail });

            setEmail(trimmedEmail);

            // Sync with local stored user object
            const userObjStr = localStorage.getItem('user');
            let userObj = {};
            if (userObjStr) {
                try { userObj = JSON.parse(userObjStr); } catch { }
            }
            userObj.email = trimmedEmail;
            localStorage.setItem('user', JSON.stringify(userObj));

            setShowEmailModal(false);
        } catch (error) {
            devError('Failed to save email:', error);
            alert("Failed to update email. Please try again.");
        } finally {
            setSavingEmail(false);
        }
    };

    const handleTogglePause = async () => {
        const next = !isPaused;
        setIsPaused(next);
        try {
            await updateUserProfile('me', { isPaused: next });
            const userObjStr = localStorage.getItem('user');
            let userObj = {};
            if (userObjStr) {
                try { userObj = JSON.parse(userObjStr); } catch { }
            }
            userObj.isPaused = next;
            localStorage.setItem('user', JSON.stringify(userObj));
        } catch (err) {
            devError('Failed to update pause state:', err);
            setIsPaused(!next);
        }
    };

    const handleToggleActiveStatus = async () => {
        const next = !showActiveStatus;
        setShowActiveStatus(next);
        try {
            await updateUserProfile('me', { showActiveStatus: next });
        } catch (err) {
            devError('Failed to update active status visibility:', err);
            setShowActiveStatus(!next);
        }
    };

    const handleLogout = async () => {
        if (window.confirm("Are you sure you want to log out?")) {
            try {
                await apiClient.post('/auth/logout', {});
            } catch {
                // Ignore network errors — clearing local session is what actually matters here.
            }
            localStorage.clear();
            navigate('/phone-input');
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("⚠️ Are you sure you want to delete your account? This action is permanent and cannot be undone.")) {
            return;
        }

        setIsDeleting(true);
        try {
            const userId = localStorage.getItem('userId');
            if (userId) {
                await deleteUserProfile(userId);
            }
            localStorage.clear();
            alert("Your account has been deleted successfully.");
            navigate('/phone-input');
        } catch (error) {
            devError('Delete account error:', error);
            localStorage.clear();
            navigate('/phone-input');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-screen bg-[#FCFCFC] flex flex-col max-w-[414px] mx-auto overflow-hidden relative">
            {/* Header */}
            <header className="relative flex items-center justify-between px-4 shrink-0 bg-[#FCFCFC] shadow-xs" style={{ height: '52px', borderRadius: '0px 0px 14px 14px' }}>
                <div className="w-[45px]" />
                <h1 className="font-bold text-[17px] text-black tracking-tight text-center flex-1">
                    Settings
                </h1>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-[45px] text-[16px] font-semibold text-[#733FE0] bg-transparent border-0 cursor-pointer text-right"
                >
                    Done
                </button>
            </header>

            <main className="flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <SectionHeader title="Profile" />
                <SettingRow label="Pause">
                    <Toggle active={isPaused} label="Pause profile" onToggle={handleTogglePause} />
                </SettingRow>

                <SettingRow label="Show Last Active Status">
                    <Toggle active={showActiveStatus} label="Show last active status" onToggle={handleToggleActiveStatus} />
                </SettingRow>

                <SectionHeader title="Phone & Email" />
                <SettingRow label="Phone Number" value={phoneNumber || "+91 76104 16911"} showCheck />
                <SettingRow
                    label="Email"
                    value={email || "Not added"}
                    showArrow
                    onClick={() => setShowEmailModal(true)}
                />
                <SettingRow
                    label="Blocked Accounts"
                    showArrow
                    onClick={() => navigate('/blocked-accounts')}
                />
                <SettingRow
                    label="Support"
                    showArrow
                    onClick={() => navigate('/support')}
                />

                <SectionHeader title="Legal" />
                <SettingRow
                    label="Privacy Policy"
                    showArrow
                    onClick={() => navigate('/privacy-policy')}
                />
                <SettingRow
                    label="Terms of service"
                    showArrow
                    onClick={() => navigate('/terms-of-service')}
                />

                <div className="mt-6 mb-2 px-4 flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full h-[50px] bg-[#F3F3F3] hover:bg-[#EBEBEB] active:scale-[0.99] transition-all rounded-[14px] border-0 text-[15px] font-bold text-gray-900 cursor-pointer shadow-xs"
                    >
                        Log out
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="w-full h-[50px] bg-red-50 hover:bg-red-100 active:scale-[0.99] transition-all rounded-[14px] border border-red-100 text-[15px] font-bold text-red-600 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting Account...' : 'Delete account'}
                    </button>
                </div>
            </main>

            {/* Email Edit Modal */}
            {showEmailModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
                    onClick={() => setShowEmailModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-[340px] p-6 shadow-xl relative animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-[18px] font-bold text-gray-900 mb-1">
                            Add Email Address
                        </h3>
                        <p className="text-[12px] text-gray-500 mb-4">
                            Enter your email to receive account recovery & updates.
                        </p>

                        <form onSubmit={handleSaveEmail} className="flex flex-col gap-4">
                            <input
                                type="email"
                                required
                                autoFocus
                                placeholder="name@example.com"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#733FE0] focus:outline-none text-[15px] font-medium text-gray-900 bg-gray-50/50"
                            />

                            <div className="flex gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowEmailModal(false)}
                                    className="flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[14px] border-0 cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEmail}
                                    className="flex-1 h-11 rounded-xl bg-[#733FE0] hover:bg-[#6232c7] text-white font-semibold text-[14px] border-0 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                                >
                                    {savingEmail ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
