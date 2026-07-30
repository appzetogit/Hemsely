import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../../../shared/services/apiClient';

const AuthContext = createContext();
const AUTH_STORAGE_KEY = 'Hemsely_user:v1';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = sessionStorage.getItem('user') ||
                          sessionStorage.getItem(AUTH_STORAGE_KEY) ||
                          localStorage.getItem('user') ||
                          localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback((userData) => {
        setUser(userData);
        if (userData) {
            sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
            sessionStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(userData));
            if (userData.id || userData._id) {
                sessionStorage.setItem('userId', userData.id || userData._id);
                localStorage.setItem('userId', userData.id || userData._id);
            }
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem('Hemsely_user');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('Hemsely_user');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        ['onboarding_profile:v1', 'onboarding_photos:v1', 'onboarding_gender:v1', 'onboarding_interests:v1', 'onboarding_goals:v1', 'onboarding_cover_photo:v1', 'profile_complete:v1', 'profile_complete'].forEach(k => {
            sessionStorage.removeItem(k);
            localStorage.removeItem(k);
        });
    }, []);

    const signup = useCallback((userData) => {
        setUser(userData);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    }, []);

    const value = useMemo(() => ({
        user, login, logout, signup, loading, apiBaseUrl: API_BASE_URL
    }), [user, login, logout, signup, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
