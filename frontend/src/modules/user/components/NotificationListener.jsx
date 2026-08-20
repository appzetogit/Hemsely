import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { onForegroundMessage } from '../../../lib/fcmService';

const getMyId = () => {
    try {
        const sUser = sessionStorage.getItem('user');
        if (sUser) {
            const parsed = JSON.parse(sUser);
            if (parsed._id || parsed.id) return String(parsed._id || parsed.id);
        }
        const lUser = localStorage.getItem('user');
        if (lUser) {
            const parsed = JSON.parse(lUser);
            if (parsed._id || parsed.id) return String(parsed._id || parsed.id);
        }
        return String(sessionStorage.getItem('userId') || localStorage.getItem('userId') || '');
    } catch {
        return String(sessionStorage.getItem('userId') || localStorage.getItem('userId') || '');
    }
};

// Cross-tab deduplication cache to prevent same notification showing multiple times across any open tab
const seenNotificationKeys = new Map();
const DEDUP_WINDOW_MS = 30000;

const isDuplicateNotification = (key) => {
    if (!key) return false;
    const now = Date.now();
    
    // In-memory check
    const lastSeen = seenNotificationKeys.get(key);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
        return true;
    }
    seenNotificationKeys.set(key, now);

    // Cross-tab check via localStorage
    try {
        const storageKey = `hemsely_notif_seen_${key}`;
        const storedTs = localStorage.getItem(storageKey);
        if (storedTs && now - Number(storedTs) < DEDUP_WINDOW_MS) {
            return true;
        }
        localStorage.setItem(storageKey, String(now));
    } catch {
        // Ignore localStorage errors (e.g. incognito quota)
    }

    // Prune stale entries
    for (const [k, ts] of seenNotificationKeys.entries()) {
        if (now - ts > DEDUP_WINDOW_MS) seenNotificationKeys.delete(k);
    }
    return false;
};

const NotificationListener = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);

    // Auto-dismiss toast after 5 seconds
    useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Socket message and match listeners
    useEffect(() => {
        if (!socket) return undefined;

        const handleNewMessage = (msg) => {
            const myId = getMyId();
            const senderId = msg.sender?._id || msg.sender;

            // Ignore messages sent by current user
            if (String(senderId) === String(myId)) return;

            // Check if current user is actively on the chat screen with this sender
            const currentPath = window.location.pathname;
            const chatMatch = currentPath.match(/\/chat\/([a-f0-9A-Z]+)/i);
            const activeChatPartnerId = chatMatch ? chatMatch[1] : null;

            // If chat with this exact user is open in foreground, SUPPRESS foreground notification!
            if (activeChatPartnerId && String(activeChatPartnerId) === String(senderId)) {
                return;
            }

            const senderName = `${msg.sender?.firstName || 'User'} ${msg.sender?.lastName || ''}`.trim();
            const photo = msg.sender?.profilePicture || null;
            const bodyText = msg.image ? '📷 Photo' : msg.audio ? '🎵 Voice message' : (msg.message || 'Sent a message');
            const dedupKey = `msg_${msg._id || `${senderId}_${bodyText}`}`;

            if (isDuplicateNotification(dedupKey)) {
                return;
            }

            setToast({
                id: msg._id || Date.now(),
                title: senderName,
                body: bodyText,
                photo,
                type: 'chat',
                targetUrl: `/chat/${senderId}`,
            });
        };

        const handleNewMatch = (data) => {
            const partnerId = data.otherUserId || data.match?.user1 || data.match?.user2;
            const partnerName = data.partnerName || 'Someone';
            const photo = data.partnerPhoto || null;
            const dedupKey = `match_${partnerId || partnerName}`;

            if (isDuplicateNotification(dedupKey)) {
                return;
            }

            setToast({
                id: `match-${Date.now()}`,
                title: "It's a Match! 💕",
                body: `You matched with ${partnerName}! Click to chat.`,
                photo,
                type: 'match',
                targetUrl: `/chat/${partnerId}`,
            });
        };

        socket.on('new_message', handleNewMessage);
        socket.on('new_match', handleNewMatch);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('new_match', handleNewMatch);
        };
    }, [socket]);

    // Single persistent FCM foreground message listener (mounted once)
    useEffect(() => {
        let isMounted = true;
        let unsubscribeFcm = null;

        onForegroundMessage((payload) => {
            if (!isMounted) return;

            const data = payload.data || {};
            const notification = payload.notification || {};
            const type = data.type || 'general';
            const title = notification.title || data.title || 'Hemsely Notification';
            const body = notification.body || data.body || '';

            // Generate deterministic dedup key
            const dedupKey = data.notificationId || data.tag || `${title}:${body}`;

            // Prevent duplicate notifications if already received or displayed recently
            if (isDuplicateNotification(dedupKey)) {
                console.log('[NotificationListener] Duplicate FCM notification suppressed:', dedupKey);
                return;
            }

            if (type === 'chat' && data.senderId) {
                const currentPath = window.location.pathname;
                const chatMatch = currentPath.match(/\/chat\/([a-f0-9A-Z]+)/i);
                const activeChatPartnerId = chatMatch ? chatMatch[1] : null;

                if (activeChatPartnerId && String(activeChatPartnerId) === String(data.senderId)) {
                    return;
                }
            }

            setToast({
                id: `fcm-${Date.now()}`,
                title,
                body,
                photo: data.senderPhoto || notification.image || null,
                type,
                targetUrl: data.url || (data.senderId ? `/chat/${data.senderId}` : '/chats'),
            });
        }).then((unsub) => {
            if (isMounted) {
                unsubscribeFcm = unsub;
            } else if (typeof unsub === 'function') {
                unsub();
            }
        });

        return () => {
            isMounted = false;
            if (typeof unsubscribeFcm === 'function') {
                unsubscribeFcm();
            }
        };
    }, []);

    if (!toast) return null;

    const handleToastClick = () => {
        if (toast.targetUrl) {
            navigate(toast.targetUrl);
        }
        setToast(null);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: 'calc(100% - 32px)',
                maxWidth: '380px',
                background: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                border: '1px solid rgba(111, 59, 206, 0.15)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={handleToastClick}
        >
            {/* Avatar or Icon */}
            {toast.photo ? (
                <img
                    src={toast.photo}
                    alt=""
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
            ) : (
                <div
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: toast.type === 'match' ? '#F6F0FF' : '#F4F4F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0,
                    }}
                >
                    {toast.type === 'match' ? '💕' : '💬'}
                </div>
            )}

            {/* Title & Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                    style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#18181B',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {toast.title}
                </h4>
                <p
                    style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: '12.5px',
                        color: '#71717A',
                        margin: '2px 0 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {toast.body}
                </p>
            </div>

            {/* Dismiss Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setToast(null);
                }}
                aria-label="Dismiss notification"
                style={{
                    background: '#F4F4F5',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#71717A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default NotificationListener;
