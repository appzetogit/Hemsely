import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import apiClient from '../../../shared/services/apiClient';
import { useSocket } from '../context/SocketContext';

import demoPhoto2 from '../assets/853e31e910922fe7f47f66de5c5206f78a610037.jpg';

// Chat Icons
import chatGalleryIcon from '../assets/icons/chat-gallery.png';
import chatSendIcon from '../assets/icons/chat-send.png';

const getMyId = () => {
    try {
        const sUser = sessionStorage.getItem('user');
        if (sUser) {
            const parsed = JSON.parse(sUser);
            if (parsed._id || parsed.id) return String(parsed._id || parsed.id);
        }
        const sId = sessionStorage.getItem('userId');
        if (sId) return String(sId);

        const lUser = localStorage.getItem('user');
        if (lUser) {
            const parsed = JSON.parse(lUser);
            if (parsed._id || parsed.id) return String(parsed._id || parsed.id);
        }
        return String(localStorage.getItem('userId') || '');
    } catch {
        return String(sessionStorage.getItem('userId') || localStorage.getItem('userId') || '');
    }
};

const formatDateLabel = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
}).toUpperCase();

/* ─── Audio Player Component ─── */
const AudioPlayerBubble = ({ audioUrl, duration, isSent }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(() => { });
        }
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const cur = audioRef.current.currentTime;
        const dur = audioRef.current.duration || duration || 1;
        setCurrentTime(cur);
        setProgress((cur / dur) * 100);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
    };

    const formatTime = (secs) => {
        if (!secs || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '170px', padding: '2px 0' }}>
            <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleEnded}
                onTimeUpdate={handleTimeUpdate}
                style={{ display: 'none' }}
            />
            <button
                type="button"
                onClick={togglePlay}
                style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isSent ? '#FFFFFF' : '#6F3BCE', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                }}
            >
                {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isSent ? '#6F3BCE' : '#FFFFFF'}>
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isSent ? '#6F3BCE' : '#FFFFFF'} style={{ marginLeft: '2px' }}>
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{
                    width: '100%', height: '4px', background: isSent ? 'rgba(255,255,255,0.3)' : '#E4E4E7',
                    borderRadius: '2px', overflow: 'hidden', position: 'relative',
                }}>
                    <div style={{
                        width: `${progress}%`, height: '100%',
                        background: isSent ? '#FFFFFF' : '#6F3BCE', transition: 'width 0.1s linear',
                    }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: isSent ? 'rgba(255,255,255,0.85)' : '#71717A', fontWeight: 500 }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Chat Bubble ─── */
const ChatBubble = ({ msg, photo, isSent, showAvatar, isUnmatched, onImageClick }) => {
    const borderRadius = isSent ? '25px 5px 25px 25px' : '5px 25px 25px 25px';

    return (
        <div style={{
            display: 'flex',
            flexDirection: isSent ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '1px 20px',
            marginBottom: '10px',
        }}>
            {!isSent ? (
                <div style={{ width: '32px', flexShrink: 0 }}>
                    {showAvatar && (
                        (isUnmatched || msg.sender?.firstName === 'Hemsely User') ? (
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: '#E4E4E7', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: '#9CA3AF'
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            </div>
                        ) : (
                            <img src={photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        )
                    )}
                </div>
            ) : null}

            <div style={{ maxWidth: '75%', background: isSent ? '#6F3BCE' : '#F3F3F3', borderRadius, padding: msg.image ? '6px' : '12px 16px' }}>
                {msg.image && (
                    <img
                        src={msg.image}
                        alt="Chat photo"
                        onClick={() => onImageClick && onImageClick(msg.image)}
                        style={{
                            width: '100%',
                            maxWidth: '220px',
                            borderRadius: '18px',
                            display: 'block',
                            marginBottom: msg.message ? '6px' : 0,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s ease, transform 0.15s ease',
                        }}
                        className="hover:opacity-90 active:scale-[0.98]"
                    />
                )}
                {msg.audio ? (
                    <AudioPlayerBubble audioUrl={msg.audio} duration={msg.audioDuration} isSent={isSent} />
                ) : msg.message ? (
                    <p style={{
                        fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: '14px',
                        lineHeight: '18px', letterSpacing: '0.02em', color: isSent ? '#FFFFFF' : '#303030', margin: 0,
                    }}>{msg.message}</p>
                ) : null}
            </div>
        </div>
    );
};

/* ─── Image Preview Lightbox Modal ─── */
const ImagePreviewModal = ({ src, onClose }) => {
    if (!src) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2000,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close image preview"
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2001,
                    transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
            >
                ✕
            </button>

            <img
                src={src}
                alt="Enlarged chat attachment"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '100%',
                    maxHeight: '85vh',
                    objectFit: 'contain',
                    borderRadius: '16px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                }}
            />
        </div>
    );
};

/* ─── Empty Chat State ─── */
const EmptyChatState = ({ onViewProfile }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <button
            type="button"
            onClick={onViewProfile}
            style={{
                width: 'auto', padding: '0 16px', height: '29.4px', background: 'rgba(217,217,217,0.2)',
                borderRadius: '14.7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
            }}
        >
            <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: '14px', lineHeight: '16px', letterSpacing: '0.01em', color: '#000' }}>View Profile</span>
        </button>
        <span style={{
            fontFamily: "'Roboto', sans-serif", fontWeight: 400, fontSize: '16px',
            lineHeight: '116.39%', letterSpacing: '0.01em', color: '#000', opacity: 0.5, textAlign: 'center',
        }}>Say hello to start the conversation</span>
    </div>
);

const REPORT_OPTIONS = [
    { id: 'fake_profile', label: 'Fake profile or spam' },
    { id: 'inappropriate_content', label: 'Inappropriate photos or nudity' },
    { id: 'harassment', label: 'Harassment or abusive behavior' },
    { id: 'scams', label: 'Scam or solicitation' },
    { id: 'underage', label: 'Underage user' },
    { id: 'hate_speech', label: 'Hate speech or discrimination' },
    { id: 'impersonation', label: 'Impersonation / stolen photos' },
    { id: 'other', label: 'Other (Specify reason below)' },
];

const ReportModal = ({ isOpen, onClose, onSubmit, targetName, submitting }) => {
    const [selectedOption, setSelectedOption] = useState('fake_profile');
    const [customReason, setCustomReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const selectedObj = REPORT_OPTIONS.find((o) => o.id === selectedOption);
        const reasonText = selectedOption === 'other' ? customReason.trim() : (selectedObj?.label || selectedOption);
        if (selectedOption === 'other' && !reasonText) {
            alert('Please enter a reason for reporting.');
            return;
        }
        onSubmit({ category: selectedOption, reason: reasonText });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            maxWidth: '414px', margin: '0 auto',
        }}>
            <div style={{
                width: '100%', background: '#FFFFFF',
                borderRadius: '24px 24px 0 0', padding: '16px 16px 24px',
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.25)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', fontWeight: 700, color: '#18181B', margin: 0 }}>
                            Report {targetName}
                        </h2>
                        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: '11.5px', color: '#71717A', margin: '2px 0 0' }}>
                            Please select a reason for reporting:
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#F4F4F5', border: 'none', borderRadius: '50%',
                            width: '26px', height: '26px', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 'bold', color: '#52525B',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {REPORT_OPTIONS.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        return (
                            <label
                                key={opt.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '6px 10px', borderRadius: '8px',
                                    border: isSelected ? '1.5px solid #6F3BCE' : '1px solid #E4E4E7',
                                    background: isSelected ? '#F6F0FF' : '#FAFAFA',
                                    cursor: 'pointer', transition: 'all 0.15s ease',
                                }}
                            >
                                <input
                                    type="radio"
                                    name="reportReason"
                                    value={opt.id}
                                    checked={isSelected}
                                    onChange={() => setSelectedOption(opt.id)}
                                    style={{ accentColor: '#6F3BCE', width: '14px', height: '14px', flexShrink: 0 }}
                                />
                                <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '12px', fontWeight: isSelected ? 600 : 400, color: '#18181B', whiteSpace: 'nowrap' }}>
                                    {opt.label}
                                </span>
                            </label>
                        );
                    })}

                    {selectedOption === 'other' && (
                        <div style={{ marginTop: '3px' }}>
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Please enter your reason here..."
                                rows={2}
                                required
                                style={{
                                    width: '100%', borderRadius: '8px', border: '1.5px solid #6F3BCE',
                                    padding: '8px', fontFamily: "'Roboto', sans-serif", fontSize: '12px',
                                    outline: 'none', resize: 'none', background: '#FFFFFF', color: '#18181B',
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '12px',
                                border: '1px solid #E4E4E7', background: '#F4F4F5',
                                fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600,
                                color: '#52525B', cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '12px',
                                border: 'none', background: '#6F3BCE',
                                fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600,
                                color: '#FFFFFF', cursor: 'pointer', opacity: submitting ? 0.6 : 1,
                            }}
                        >
                            {submitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─── Chat Screen Page ─── */
const ChatScreenPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId: partnerId } = useParams();
    const { socket } = useSocket() || {};
    const myId = getMyId();

    const chatData = location.state || {};
    const chatName = chatData.name || 'Chat';
    const chatPhoto = chatData.photo || demoPhoto2;

    const [isUnmatched, setIsUnmatched] = useState(chatData.isUnmatched || false);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);
    const [unmatching, setUnmatching] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setPreviewImage(null);
            }
        };
        if (previewImage) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewImage]);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const menuRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);

    const currentName = isUnmatched ? 'Hemsely User' : chatName;
    const currentPhoto = isUnmatched ? demoPhoto2 : chatPhoto;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!partnerId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data, ok } = await apiClient.get(`/messages/conversation/${partnerId}`);
                if (!cancelled && ok && data.success) {
                    setMessages(data.messages);
                    if (data.isUnmatched !== undefined) {
                        setIsUnmatched(data.isUnmatched);
                    }
                }
                apiClient.put(`/messages/read/${partnerId}`, {}).catch(() => { });
            } catch {
                // Network failure — fall through and stop the loading spinner below.
            }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [partnerId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, partnerTyping]);

    useEffect(() => {
        if (!socket || !partnerId) return undefined;

        const onNewMessage = (msg) => {
            const senderId = msg.sender?._id || msg.sender;
            const receiverId = msg.receiver?._id || msg.receiver;

            // Accept message if it belongs to this active conversation
            const isFromPartner = String(senderId) === String(partnerId);
            const isToPartner = String(receiverId) === String(partnerId) && String(senderId) === String(myId);

            if (!isFromPartner && !isToPartner) return;

            setMessages((prev) => {
                if (prev.some((m) => String(m._id) === String(msg._id))) {
                    return prev;
                }
                return [...prev, msg];
            });

            if (isFromPartner) {
                apiClient.put(`/messages/read/${partnerId}`, {}).catch(() => { });
            }
        };

        const onTyping = ({ senderId, isTyping }) => {
            if (String(senderId) === String(partnerId)) setPartnerTyping(isTyping);
        };

        const onUserUnmatched = ({ unmatchBy, targetId }) => {
            if (String(unmatchBy) === String(partnerId) || String(targetId) === String(partnerId)) {
                setIsUnmatched(true);
            }
        };

        socket.on('new_message', onNewMessage);
        socket.on('typing', onTyping);
        socket.on('user_unmatched', onUserUnmatched);
        return () => {
            socket.off('new_message', onNewMessage);
            socket.off('typing', onTyping);
            socket.off('user_unmatched', onUserUnmatched);
        };
    }, [socket, partnerId, myId]);

    const notifyTyping = (isTyping) => {
        socket?.emit('typing', { receiverId: partnerId, isTyping });
    };

    const handleInputChange = (e) => {
        setMessageText(e.target.value);
        notifyTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => notifyTyping(false), 1500);
    };

    const handleSend = async () => {
        const trimmed = messageText.trim();
        if (!trimmed || !partnerId || sending || isUnmatched) return;

        setSending(true);
        setMessageText('');
        notifyTyping(false);

        try {
            const { data, ok } = await apiClient.post(`/messages/send/${partnerId}`, { message: trimmed });
            if (ok && data.success) {
                setMessages((prev) => {
                    if (prev.some((m) => String(m._id) === String(data.data._id))) {
                        return prev;
                    }
                    return [...prev, data.data];
                });
            } else {
                if (data?.message?.includes('unmatched')) {
                    setIsUnmatched(true);
                }
                setMessageText(trimmed);
            }
        } catch {
            // Network failure — restore the draft so the message isn't silently lost.
            setMessageText(trimmed);
        } finally {
            setSending(false);
        }
    };

    const handleReport = () => {
        setShowMenu(false);
        setShowReportModal(true);
    };

    const handleSubmitReport = async ({ category, reason }) => {
        if (!partnerId || !myId || submittingReport) return;
        setSubmittingReport(true);
        const { ok } = await apiClient.post(`/users/${myId}/report/${partnerId}`, {
            category,
            reason,
        });
        setSubmittingReport(false);
        setShowReportModal(false);
        if (ok) {
            window.alert('Thanks — your report has been submitted to our team for review.');
        } else {
            window.alert('Failed to submit report. Please try again.');
        }
    };

    const handleUnmatchClick = () => {
        setShowMenu(false);
        setShowUnmatchConfirm(true);
    };

    const handleConfirmUnmatch = async () => {
        if (!partnerId) return;
        setUnmatching(true);
        try {
            await apiClient.post(`/matches/unmatch/${partnerId}`);
            setIsUnmatched(true);
        } catch (err) {
            console.error('Error during unmatch API:', err);
        } finally {
            setUnmatching(false);
            setShowUnmatchConfirm(false);
        }
    };

    const handleBlock = async () => {
        setShowMenu(false);
        if (!partnerId || !myId) return;
        if (!window.confirm(`Are you sure you want to block ${currentName}? You will no longer see messages or matches from this user.`)) return;
        const { ok } = await apiClient.post(`/users/${myId}/block/${partnerId}`, {});
        if (ok) {
            window.alert(`${currentName} has been blocked.`);
            navigate('/chats', { replace: true });
        } else {
            window.alert('Failed to block user.');
        }
    };

    const handleAttachImage = () => fileInputRef.current?.click();

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Microphone access error:', err);
            alert('Microphone access is required to record voice messages.');
        }
    };

    const stopRecordingAndSend = () => {
        if (!mediaRecorderRef.current || !isRecording) return;
        clearInterval(recordingTimerRef.current);

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            }

            const duration = recordingTime || 1;
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result;
                setSending(true);
                const { data, ok } = await apiClient.post(`/messages/send/${partnerId}`, {
                    message: '🎵 Voice message',
                    audio: base64Audio,
                    audioDuration: duration,
                });
                if (ok && data.success) {
                    setMessages((prev) => {
                        if (prev.some((m) => String(m._id) === String(data.data._id))) {
                            return prev;
                        }
                        return [...prev, data.data];
                    });
                }
                setSending(false);
            };
        };

        mediaRecorderRef.current.stop();
        setIsRecording(false);
    };

    const cancelRecording = () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = () => {
                if (mediaRecorderRef.current.stream) {
                    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
                }
            };
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setRecordingTime(0);
    };

    const formatRecordingTimer = (secs) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleSendLike = async () => {
        if (!partnerId || sending || isUnmatched) return;
        setSending(true);
        const { data, ok } = await apiClient.post(`/messages/send/${partnerId}`, { message: '👍' });
        if (ok && data.success) {
            setMessages((prev) => {
                if (prev.some((m) => String(m._id) === String(data.data._id))) {
                    return prev;
                }
                return [...prev, data.data];
            });
        }
        setSending(false);
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !partnerId || isUnmatched) return;

        setSending(true);
        const formData = new FormData();
        formData.append('message', '📷 Photo');
        formData.append('image', file);
        const { data, ok } = await apiClient.post(`/messages/send/${partnerId}`, formData);
        if (ok && data.success) {
            setMessages((prev) => [...prev, data.data]);
        }
        setSending(false);
    };

    // Group consecutive messages from the same sender under one date label / avatar
    const rows = [];
    let lastDate = null;
    let lastSenderId = null;
    messages.forEach((msg) => {
        const msgDate = new Date(msg.createdAt).toDateString();
        if (msgDate !== lastDate) {
            rows.push({ type: 'date', key: `date-${msg._id}`, text: formatDateLabel(msg.createdAt) });
            lastDate = msgDate;
            lastSenderId = null;
        }
        const senderId = msg.sender?._id || msg.sender;
        const isSent = String(senderId) === String(myId);
        rows.push({
            type: 'message', key: msg._id, msg,
            isSent,
            showAvatar: !isSent && String(senderId) !== String(lastSenderId),
        });
        lastSenderId = senderId;
    });

    return (
        <div className="h-[100dvh] flex flex-col max-w-[414px] mx-auto relative overflow-hidden" style={{ background: '#FCFCFC' }}>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />

            {/* Header */}
            <header style={{
                width: '100%', minHeight: '58px', height: '58px',
                background: 'rgba(252, 252, 252, 1)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', padding: '8px 16px',
                position: 'relative', zIndex: 10, flexShrink: 0,
            }}>
                <button
                    type="button"
                    aria-label="Back to chats"
                    onClick={() => navigate('/chats')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#303030" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15,18 9,12 15,6" />
                    </svg>
                </button>

                <button
                    type="button"
                    onClick={() => { if (!isUnmatched) navigate(`/profile-detail/${partnerId}`); }}
                    style={{ background: 'none', border: 'none', cursor: isUnmatched ? 'default' : 'pointer', padding: 0 }}
                >
                    {isUnmatched ? (
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#E4E4E7', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#9CA3AF'
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                    ) : (
                        <img src={currentPhoto} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                </button>

                <div style={{ marginLeft: '10px', flex: 1, minWidth: 0 }}>
                    <h1 style={{
                        fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '16px',
                        lineHeight: '20px', letterSpacing: '0.01em', color: '#303030', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{currentName}</h1>
                    {!isUnmatched && partnerTyping && (
                        <span style={{ fontSize: '11px', color: '#6F3BCE', fontWeight: 500 }}>typing...</span>
                    )}
                </div>

                {!isUnmatched && (
                    <div ref={menuRef} style={{ position: 'relative' }}>
                        <button
                            type="button"
                            aria-label="More options"
                            onClick={() => setShowMenu((prev) => !prev)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#303030">
                                <circle cx="12" cy="5" r="1.6" />
                                <circle cx="12" cy="12" r="1.6" />
                                <circle cx="12" cy="19" r="1.6" />
                            </svg>
                        </button>

                        {showMenu && (
                            <div style={{
                                position: 'absolute', right: 0, top: '38px',
                                background: '#FFFFFF', borderRadius: '12px',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                border: '1px solid #EBEBEB', padding: '6px 0',
                                minWidth: '150px', zIndex: 100,
                            }}>
                                <button
                                    type="button"
                                    onClick={handleUnmatchClick}
                                    style={{
                                        width: '100%', padding: '10px 16px', background: 'transparent',
                                        border: 'none', textAlign: 'left', cursor: 'pointer',
                                        fontFamily: "'Roboto', sans-serif", fontSize: '14px', fontWeight: 500,
                                        color: '#303030', display: 'flex', alignItems: 'center', gap: '10px',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F7F7'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                        <line x1="2" y1="2" x2="22" y2="22" />
                                    </svg>
                                    Unmatch
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReport}
                                    style={{
                                        width: '100%', padding: '10px 16px', background: 'transparent',
                                        border: 'none', textAlign: 'left', cursor: 'pointer',
                                        fontFamily: "'Roboto', sans-serif", fontSize: '14px', fontWeight: 500,
                                        color: '#303030', display: 'flex', alignItems: 'center', gap: '10px',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F7F7'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                        <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                    Report
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBlock}
                                    style={{
                                        width: '100%', padding: '10px 16px', background: 'transparent',
                                        border: 'none', textAlign: 'left', cursor: 'pointer',
                                        fontFamily: "'Roboto', sans-serif", fontSize: '14px', fontWeight: 500,
                                        color: '#E53E3E', display: 'flex', alignItems: 'center', gap: '10px',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF5F5'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                    </svg>
                                    Block
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Messages Area */}
            <main className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ padding: '10px 0' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 rounded-full border-4 border-[#F0EBFB] border-t-[#6F3BCE] animate-spin" />
                    </div>
                ) : rows.length === 0 ? (
                    <EmptyChatState onViewProfile={() => navigate(`/profile-detail/${partnerId}`)} />
                ) : (
                    rows.map((row) => (
                        row.type === 'date' ? (
                            <div key={row.key} style={{
                                textAlign: 'center', padding: '24px 0 12px', fontFamily: "'Roboto', sans-serif",
                                fontWeight: 500, fontSize: '13px', lineHeight: '16px', letterSpacing: '0.01em', color: '#797C7B',
                            }}>{row.text}</div>
                        ) : (
                            <ChatBubble
                                key={row.key}
                                msg={row.msg}
                                photo={currentPhoto}
                                isSent={row.isSent}
                                showAvatar={row.showAvatar}
                                isUnmatched={isUnmatched}
                                onImageClick={(imgSrc) => setPreviewImage(imgSrc)}
                            />
                        )
                    ))
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Bar */}
            {isUnmatched ? (
                <footer style={{
                    width: '100%', padding: '10px 12px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, background: '#F4F4F6',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontFamily: "'Roboto', sans-serif", fontSize: '12px', fontWeight: 500, color: '#71717A',
                        whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Unmatched user - No longer send messages.</span>
                    </div>
                </footer>
            ) : isRecording ? (
                <footer style={{
                    width: '100%', padding: '10px 14px 28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', flexShrink: 0, background: '#FFFFFF',
                    borderTop: '1px solid rgba(0,0,0,0.03)',
                }}>
                    <button
                        type="button"
                        onClick={cancelRecording}
                        aria-label="Cancel recording"
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: '#FEE2E2', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#F4F4F6', borderRadius: '20px', padding: '0 16px', height: '40px' }}>
                        <span className="animate-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                        <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                            Recording... {formatRecordingTimer(recordingTime)}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={stopRecordingAndSend}
                        aria-label="Send voice message"
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: '#6F3BCE', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </button>
                </footer>
            ) : (
                <footer style={{
                    width: '100%', padding: '10px 14px 28px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    flexShrink: 0, background: '#FFFFFF',
                    borderTop: '1px solid rgba(0,0,0,0.03)',
                }}>
                    <button
                        type="button"
                        aria-label="Attach photo"
                        onClick={handleAttachImage}
                        disabled={sending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24">
                            <rect x="2" y="2" width="20" height="20" rx="5" fill="#6F3BCE" />
                            <circle cx="7.5" cy="7.5" r="1.8" fill="#FFFFFF" />
                            <path d="M19.5 18H4.5l4.5-6 3 4 3.5-4.5 4 6.5z" fill="#FFFFFF" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        aria-label="Voice message"
                        onClick={startRecording}
                        disabled={sending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#6F3BCE">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                    </button>

                    <div style={{
                        flex: 1, height: '40px', background: '#F4F4F6',
                        borderRadius: '20px', display: 'flex', alignItems: 'center',
                        padding: '0 8px 0 16px', gap: '8px',
                    }}>
                        <input
                            value={messageText}
                            onChange={handleInputChange}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                            placeholder="Aa"
                            aria-label="Type a message"
                            disabled={sending}
                            style={{
                                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                                fontFamily: "'Roboto', sans-serif", fontWeight: 400, fontSize: '15px', color: '#18181B',
                            }}
                        />
                        <button
                            type="button"
                            aria-label="Send message"
                            onClick={handleSend}
                            disabled={sending || !messageText.trim()}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                                opacity: sending || !messageText.trim() ? 0.35 : 1, display: 'flex', alignItems: 'center',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#6F3BCE">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>

                    <button
                        type="button"
                        aria-label="Send like"
                        onClick={handleSendLike}
                        disabled={sending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#6F3BCE">
                            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                        </svg>
                    </button>
                </footer>
            )}

            <ReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSubmit={handleSubmitReport}
                targetName={chatName}
                submitting={submittingReport}
            />

            {/* Unmatch Confirmation Modal */}
            {showUnmatchConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px',
                }}>
                    <div style={{
                        background: '#FFFFFF', borderRadius: '20px', padding: '20px',
                        maxWidth: '340px', width: '100%', textAlign: 'center',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: '#FFF5F5', color: '#E53E3E',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px', fontSize: '22px',
                        }}>
                            💔
                        </div>
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 700, color: '#18181B', margin: '0 0 6px' }}>
                            Unmatch {chatName}?
                        </h3>
                        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', color: '#71717A', margin: '0 0 18px', lineHeight: '1.4' }}>
                            Are you sure you want to unmatch {chatName}? You will no longer be able to message each other.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setShowUnmatchConfirm(false)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '12px',
                                    border: '1px solid #E4E4E7', background: '#F4F4F5',
                                    fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600,
                                    color: '#52525B', cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnmatch}
                                disabled={unmatching}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '12px',
                                    border: 'none', background: '#E53E3E',
                                    fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600,
                                    color: '#FFFFFF', cursor: 'pointer', opacity: unmatching ? 0.6 : 1,
                                }}
                            >
                                {unmatching ? 'Unmatching...' : 'Unmatch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Lightbox / Zoom Preview Modal */}
            <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
        </div>
    );
};

export default ChatScreenPage;
