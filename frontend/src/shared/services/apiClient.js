const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');

export const API_BASE_URL = (() => {
    const envUrl = import.meta.env.VITE_API_URL?.trim();
    if (envUrl) return normalizeBaseUrl(envUrl);
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return `${window.location.origin}/api`;
    }
    return 'http://localhost:5000/api';
})();

export const BACKEND_ORIGIN = (() => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
    }
})();

export const SOCKET_URL = (() => {
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    if (envSocketUrl) return normalizeBaseUrl(envSocketUrl);
    return BACKEND_ORIGIN;
})();

/**
 * Recursively scans any API response payload and resolves relative /uploads paths
 * to absolute backend URLs. Bypasses File/Blob objects so file uploads pass through untouched.
 */
export const resolveUploadsUrls = (obj, origin = BACKEND_ORIGIN) => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        const isUploadPath =
            (obj.startsWith('/uploads/') ||
                obj.startsWith('uploads/') ||
                obj.startsWith('/api/uploads/') ||
                obj.startsWith('api/uploads/')) &&
            !obj.startsWith('//') &&
            !obj.startsWith('data:');

        if (isUploadPath) {
            const cleanPath = obj.startsWith('/') ? obj : `/${obj}`;
            const baseOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
            return `${baseOrigin}${cleanPath}`;
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => resolveUploadsUrls(item, origin));
    }

    if (typeof obj === 'object') {
        if (obj instanceof Blob || obj instanceof File || (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement)) {
            return obj;
        }
        const newObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = resolveUploadsUrls(obj[key], origin);
            }
        }
        return newObj;
    }

    return obj;
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (newToken) => {
    refreshSubscribers.forEach((cb) => cb(newToken));
    refreshSubscribers = [];
};

/**
 * Custom zero-dependency fetch wrapper with automatic Authorization header and 401 refresh token interceptor
 */
export const apiClient = {
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http')
            ? endpoint
            : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

        const headers = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        const config = {
            ...options,
            headers,
            credentials: 'include',
        };

        let response = await fetch(url, config);

        // Handle 401 Unauthorized - Refresh Token Rotation
        if (response.status === 401 && !options._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh(async (newToken) => {
                        try {
                            const retryHeaders = {
                                ...headers,
                                Authorization: `Bearer ${newToken}`,
                            };
                            const retryRes = await fetch(url, { ...config, headers: retryHeaders, _retry: true });
                            const data = resolveUploadsUrls(await retryRes.json());
                            resolve({ data, status: retryRes.status, ok: retryRes.ok });
                        } catch (err) {
                            reject(err);
                        }
                    });
                });
            }

            options._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
                const refreshHeaders = {
                    'Content-Type': 'application/json',
                    ...(refreshToken ? { 'x-refresh-token': refreshToken, Authorization: `Bearer ${refreshToken}` } : {}),
                };
                const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: refreshHeaders,
                    body: JSON.stringify({ refreshToken }),
                    credentials: 'include',
                });

                const refreshData = await refreshRes.json();

                if (refreshRes.ok && refreshData.success) {
                    const newToken = refreshData.token;
                    const newRefreshToken = refreshData.refreshToken;

                    if (newToken) {
                        sessionStorage.setItem('token', newToken);
                        localStorage.setItem('token', newToken);
                    }
                    if (newRefreshToken) {
                        sessionStorage.setItem('refreshToken', newRefreshToken);
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }

                    isRefreshing = false;
                    onRefreshed(newToken);

                    // Retry original request
                    const retryHeaders = {
                        ...headers,
                        Authorization: `Bearer ${newToken}`,
                    };
                    const retryRes = await fetch(url, { ...config, headers: retryHeaders });
                    const data = resolveUploadsUrls(await retryRes.json());
                    return { data, status: retryRes.status, ok: retryRes.ok };
                } else {
                    isRefreshing = false;
                    refreshSubscribers = [];
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('refreshToken');
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    localStorage.removeItem('userId');
                    if (typeof window !== 'undefined' && !['/login', '/phone-input', '/verify'].includes(window.location.pathname)) {
                        window.location.href = '/login';
                    }
                }
            } catch (refreshErr) {
                isRefreshing = false;
                refreshSubscribers = [];
                if (import.meta.env.DEV) console.error('Failed to refresh token:', refreshErr);
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('refreshToken');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                localStorage.removeItem('userId');
                if (typeof window !== 'undefined' && !['/login', '/phone-input', '/verify'].includes(window.location.pathname)) {
                    window.location.href = '/login';
                }
            }
        }

        let data = {};
        try {
            data = resolveUploadsUrls(await response.json());
        } catch {
            // empty body response
        }

        if (response.status === 503) {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
                window.dispatchEvent(new CustomEvent('app_maintenance_mode', {
                    detail: { message: data?.message || 'The app is temporarily down for maintenance.' }
                }));
            }
        }

        if (!response.ok && response.status === 404 && data?.message === 'User not found') {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('refreshToken');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
            if (typeof window !== 'undefined' && !['/login', '/phone-input', '/verify'].includes(window.location.pathname)) {
                window.location.href = '/login';
            }
        }

        return { data, status: response.status, ok: response.ok };
    },

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint, body, options = {}) {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: isFormData || typeof body === 'string' ? body : JSON.stringify(body),
        });
    },

    put(endpoint, body, options = {}) {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: isFormData || typeof body === 'string' ? body : JSON.stringify(body),
        });
    },

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    },
};

export default apiClient;
