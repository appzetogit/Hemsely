import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'hemsely_boost_until';

/**
 * Shared hook to manage 40-minute Profile Boost countdown timer.
 * Automatically synchronizes across screens and reloads using absolute target timestamp.
 */
export const useProfileBoost = (user, onExpired) => {
    const onExpiredRef = useRef(onExpired);
    useEffect(() => {
        onExpiredRef.current = onExpired;
    }, [onExpired]);

    const getStoredUntil = useCallback(() => {
        if (user?.boostUntil) return user.boostUntil;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return raw;
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            return u?.boostUntil || null;
        } catch {
            return null;
        }
    }, [user?.boostUntil]);

    const [boostUntil, setBoostUntil] = useState(getStoredUntil);
    const [timeLeftMs, setTimeLeftMs] = useState(() => {
        const target = getStoredUntil();
        if (!target) return 0;
        const diff = new Date(target).getTime() - Date.now();
        return diff > 0 ? diff : 0;
    });

    // Synchronize if user prop updates (e.g. from /auth/me or API response)
    useEffect(() => {
        if (user?.boostUntil) {
            setBoostUntil((prev) => {
                if (prev === user.boostUntil) return prev;
                return user.boostUntil;
            });
            try {
                localStorage.setItem(STORAGE_KEY, user.boostUntil);
            } catch {}
        } else if (user && user.isBoosted === false) {
            const target = localStorage.getItem(STORAGE_KEY);
            if (!target || new Date(target).getTime() <= Date.now()) {
                setBoostUntil((prev) => (prev ? null : prev));
                setTimeLeftMs((prev) => (prev > 0 ? 0 : prev));
            }
        }
    }, [user?.boostUntil, user?.isBoosted]);

    // Interval to tick countdown every second
    useEffect(() => {
        if (!boostUntil) {
            setTimeLeftMs((prev) => (prev > 0 ? 0 : prev));
            return;
        }

        const computeAndCheck = () => {
            const targetTime = new Date(boostUntil).getTime();
            const now = Date.now();
            const diff = targetTime - now;

            if (diff <= 0) {
                setTimeLeftMs(0);
                setBoostUntil(null);
                try {
                    localStorage.removeItem(STORAGE_KEY);
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    if (localUser.isBoosted) {
                        localUser.isBoosted = false;
                        localUser.boostUntil = null;
                        localStorage.setItem('user', JSON.stringify(localUser));
                        sessionStorage.setItem('user', JSON.stringify(localUser));
                    }
                } catch {}
                if (typeof onExpiredRef.current === 'function') {
                    onExpiredRef.current();
                }
            } else {
                setTimeLeftMs(diff);
            }
        };

        computeAndCheck();
        const intervalId = setInterval(computeAndCheck, 1000);

        return () => clearInterval(intervalId);
    }, [boostUntil]);

    // Listen to custom boost update events across screens/tabs
    useEffect(() => {
        const handleBoostChange = () => {
            const updated = getStoredUntil();
            setBoostUntil((prev) => (prev === updated ? prev : updated));
        };

        window.addEventListener('storage', handleBoostChange);
        window.addEventListener('hemsely_boost_updated', handleBoostChange);

        return () => {
            window.removeEventListener('storage', handleBoostChange);
            window.removeEventListener('hemsely_boost_updated', handleBoostChange);
        };
    }, [getStoredUntil]);

    const activateBoostState = useCallback((newBoostUntil) => {
        if (!newBoostUntil) return;
        setBoostUntil(newBoostUntil);
        try {
            localStorage.setItem(STORAGE_KEY, newBoostUntil);
            window.dispatchEvent(new Event('hemsely_boost_updated'));
        } catch {}
        const diff = new Date(newBoostUntil).getTime() - Date.now();
        setTimeLeftMs(diff > 0 ? diff : 0);
    }, []);

    const isBoostActive = timeLeftMs > 0;
    const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedRemaining = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    const boostText = isBoostActive ? `Boost active · ${formattedRemaining} remaining` : '';

    return {
        isBoostActive,
        timeLeftMs,
        minutes,
        seconds,
        formattedRemaining,
        boostText,
        boostUntil,
        activateBoostState,
    };
};
