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

/* ─── Chat Bubble ─── */
const ChatBubble = ({ msg, photo, isSent, showAvatar }) => {
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
                        <img src={photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                </div>
            ) : null}

            <div style={{ maxWidth: '75%', background: isSent ? '#6F3BCE' : '#F3F3F3', borderRadius, padding: msg.image ? '6px' : '12px 16px' }}>
                {msg.image && (
                    <img src={msg.image} alt="" style={{ width: '100%', maxWidth: '220px', borderRadius: '18px', display: 'block', marginBottom: msg.message ? '6px' : 0 }} />
                )}
                {msg.message && (
                    <p style={{
                        fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: '14px',
                        lineHeight: '18px', letterSpacing: '0.02em', color: isSent ? '#FFFFFF' : '#303030', margin: 0,
                    }}>{msg.message}</p>
                )}
            </div>
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

/* ─── Chat Screen Page ─── */
const ChatScreenPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId: partnerId } = useParams();
    const { socket } = useSocket() || {};
    const myId = getMyId();

    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const chatData = location.state || {};
    const chatName = chatData.name || 'Chat';
    const chatPhoto = chatData.photo || demoPhoto2;

    useEffect(() => {
        if (!partnerId) return;
        let cancelled = false;
        (async () => {
            const { data, ok } = await apiClient.get(`/messages/conversation/${partnerId}`);
            if (!cancelled && ok && data.success) {
                setMessages(data.messages);
            }
            if (!cancelled) setLoading(false);
            apiClient.put(`/messages/read/${partnerId}`, {}).catch(() => {});
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
                apiClient.put(`/messages/read/${partnerId}`, {}).catch(() => {});
            }
        };

        const onTyping = ({ senderId, isTyping }) => {
            if (String(senderId) === String(partnerId)) setPartnerTyping(isTyping);
        };

        socket.on('new_message', onNewMessage);
        socket.on('typing', onTyping);
        return () => {
            socket.off('new_message', onNewMessage);
            socket.off('typing', onTyping);
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
        if (!trimmed || !partnerId || sending) return;

        setSending(true);
        setMessageText('');
        notifyTyping(false);

        const { data, ok } = await apiClient.post(`/messages/send/${partnerId}`, { message: trimmed });
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

    const handleReport = async () => {
        if (!partnerId || !myId) return;
        if (!window.confirm(`Report ${chatName}? Our team will review this conversation.`)) return;
        await apiClient.post(`/users/${myId}/report/${partnerId}`, {});
        window.alert('Thanks — this has been reported to our team.');
    };

    const handleAttachImage = () => fileInputRef.current?.click();

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !partnerId) return;

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
                width: '100%', minHeight: '80px',
                background: 'rgba(252, 252, 252, 1)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', padding: '14px 20px',
                position: 'relative', zIndex: 10, flexShrink: 0,
            }}>
                <button
                    type="button"
                    aria-label="Back to chats"
                    onClick={() => navigate('/chats')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '12px' }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#303030" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15,18 9,12 15,6" />
                    </svg>
                </button>

                <button type="button" onClick={() => navigate(`/profile-detail/${partnerId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <img src={chatPhoto} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                </button>

                <div style={{ marginLeft: '12px', flex: 1, minWidth: 0 }}>
                    <h1 style={{
                        fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '18px',
                        lineHeight: '24px', letterSpacing: '0.02em', color: '#303030', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{chatName}</h1>
                    {partnerTyping && (
                        <span style={{ fontSize: '12px', color: '#6F3BCE', fontWeight: 500 }}>typing...</span>
                    )}
                </div>

                <button type="button" aria-label="Report user" onClick={handleReport} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#303030">
                        <circle cx="12" cy="5" r="1.6" />
                        <circle cx="12" cy="12" r="1.6" />
                        <circle cx="12" cy="19" r="1.6" />
                    </svg>
                </button>
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
                            <ChatBubble key={row.key} msg={{ message: row.msg.message, image: row.msg.image }} photo={chatPhoto} isSent={row.isSent} showAvatar={row.showAvatar} />
                        )
                    ))
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Bar */}
            <footer style={{
                width: '100%', padding: '10px 16px 30px',
                display: 'flex', alignItems: 'center', gap: '10px',
                flexShrink: 0, background: '#FCFCFC',
            }}>
                <button type="button" aria-label="Attach gallery image" onClick={handleAttachImage} disabled={sending} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <img src={chatGalleryIcon} alt="" style={{ width: '32px', height: '32px' }} />
                </button>

                <div style={{
                    flex: 1, height: '40px', background: '#F3F3F3',
                    borderRadius: '20px', display: 'flex', alignItems: 'center',
                    padding: '0 16px',
                }}>
                    <input
                        value={messageText}
                        onChange={handleInputChange}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                        placeholder="Message..."
                        aria-label="Type a message"
                        disabled={sending}
                        style={{
                            width: '100%', background: 'transparent', border: 'none', outline: 'none',
                            fontFamily: "'Roboto', sans-serif", fontWeight: 400, fontSize: '16px', color: '#303030',
                        }}
                    />
                </div>

                <button type="button" aria-label="Send message" onClick={handleSend} disabled={sending || !messageText.trim()} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: sending || !messageText.trim() ? 0.4 : 1 }}>
                    <img src={chatSendIcon} alt="" style={{ width: '32px', height: '32px' }} />
                </button>
            </footer>
        </div>
    );
};

export default ChatScreenPage;
