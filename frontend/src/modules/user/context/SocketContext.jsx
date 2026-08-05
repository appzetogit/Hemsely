import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_ORIGIN, SOCKET_URL } from '../../../shared/services/apiClient';

const SocketContext = createContext(null);

const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [token, setToken] = useState(getToken);

    // Synchronize token state per-tab (preferring sessionStorage for multi-tab testing)
    useEffect(() => {
        const checkToken = () => {
            const currentToken = getToken();
            if (currentToken !== token) {
                setToken(currentToken);
            }
        };

        window.addEventListener('storage', checkToken);
        const interval = setInterval(checkToken, 1000);
        return () => {
            window.removeEventListener('storage', checkToken);
            clearInterval(interval);
        };
    }, [token]);

    const connectSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const currentToken = getToken();
        if (!currentToken) {
            setConnected(false);
            return;
        }

        const socket = io(SOCKET_URL, {
            auth: { token: currentToken },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            setConnected(true);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.warn('Socket connection error:', err?.message);
            setConnected(false);
        });

        socketRef.current = socket;
    }, []);

    useEffect(() => {
        if (token) {
            connectSocket();
        } else if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setConnected(false);
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [token, connectSocket]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected, reconnect: connectSocket }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext) || {};
