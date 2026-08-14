import { API_BASE_URL, resolveUploadsUrls } from '../../../shared/services/apiClient';

const ADMIN_SESSION_KEY = 'hemsely_admin_session:v1';

let isRefreshingAdmin = false;
let refreshSubscribersAdmin = [];

const subscribeAdminTokenRefresh = (cb) => {
    refreshSubscribersAdmin.push(cb);
};

const onAdminRefreshed = (newToken) => {
    refreshSubscribersAdmin.forEach((cb) => cb(newToken));
    refreshSubscribersAdmin = [];
};

export const clearAdminSession = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminRefreshToken');
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
};

const request = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');

    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    // Handle 401 Unauthorized - Refresh Token Rotation for Admin
    if (
        response.status === 401 &&
        !options._retry &&
        !endpoint.includes('/admin/login') &&
        !endpoint.includes('/admin/refresh')
    ) {
        if (isRefreshingAdmin) {
            return new Promise((resolve, reject) => {
                subscribeAdminTokenRefresh(async (newToken) => {
                    try {
                        const retryHeaders = {
                            ...headers,
                            Authorization: `Bearer ${newToken}`,
                        };
                        const retryRes = await fetch(url, { ...options, headers: retryHeaders, credentials: 'include', _retry: true });
                        let retryData = {};
                        try {
                            retryData = resolveUploadsUrls(await retryRes.json());
                        } catch {
                            // empty body
                        }
                        resolve({ data: retryData, status: retryRes.status, ok: retryRes.ok });
                    } catch (err) {
                        reject(err);
                    }
                });
            });
        }

        options._retry = true;
        isRefreshingAdmin = true;

        try {
            const refreshToken = sessionStorage.getItem('adminRefreshToken') || localStorage.getItem('adminRefreshToken');
            const refreshHeaders = {
                'Content-Type': 'application/json',
                ...(refreshToken ? { 'x-refresh-token': refreshToken, Authorization: `Bearer ${refreshToken}` } : {}),
            };

            const refreshRes = await fetch(`${API_BASE_URL}/admin/refresh`, {
                method: 'POST',
                headers: refreshHeaders,
                body: JSON.stringify({ refreshToken }),
                credentials: 'include',
            });

            let refreshData = {};
            try {
                refreshData = await refreshRes.json();
            } catch {
                // empty body
            }

            if (refreshRes.ok && refreshData.success) {
                const newToken = refreshData.token;
                const newRefreshToken = refreshData.refreshToken;

                if (newToken) {
                    sessionStorage.setItem('adminToken', newToken);
                    localStorage.setItem('adminToken', newToken);
                }
                if (newRefreshToken) {
                    sessionStorage.setItem('adminRefreshToken', newRefreshToken);
                    localStorage.setItem('adminRefreshToken', newRefreshToken);
                }
                sessionStorage.setItem(ADMIN_SESSION_KEY, 'active');
                localStorage.setItem(ADMIN_SESSION_KEY, 'active');

                isRefreshingAdmin = false;
                onAdminRefreshed(newToken);

                const retryHeaders = {
                    ...headers,
                    Authorization: `Bearer ${newToken}`,
                };
                const retryRes = await fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
                let retryData = {};
                try {
                    retryData = resolveUploadsUrls(await retryRes.json());
                } catch {
                    // empty body
                }
                return { data: retryData, status: retryRes.status, ok: retryRes.ok };
            } else {
                isRefreshingAdmin = false;
                refreshSubscribersAdmin = [];
                clearAdminSession();
                if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
                    window.location.href = '/admin/login';
                }
            }
        } catch (refreshErr) {
            isRefreshingAdmin = false;
            refreshSubscribersAdmin = [];
            clearAdminSession();
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
                window.location.href = '/admin/login';
            }
        }
    } else if (response.status === 401 && !endpoint.includes('/admin/login') && !endpoint.includes('/admin/refresh')) {
        clearAdminSession();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
            window.location.href = '/admin/login';
        }
    }

    let data = {};
    try {
        data = resolveUploadsUrls(await response.json());
    } catch {
        if (!response.ok) {
            data = {
                success: false,
                message: response.status === 502 || response.status === 503 || response.status === 504
                    ? `Server unavailable (${response.status} Bad Gateway). Backend service on live server may be stopped or restarting.`
                    : `Server returned an error status (${response.status}).`
            };
        }
    }

    return { data, status: response.status, ok: response.ok };
};

const withQueryParams = (endpoint, params) => {
    if (!params) return endpoint;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.append(key, value);
        }
    });
    const queryString = query.toString();
    if (!queryString) return endpoint;
    return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
};

export const adminApi = {
    get: (endpoint, options = {}) => {
        const { params, ...rest } = options;
        return request(withQueryParams(endpoint, params), { ...rest, method: 'GET' });
    },
    post: (endpoint, body, options = {}) => {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        return request(endpoint, { ...options, method: 'POST', body: isFormData ? body : JSON.stringify(body) });
    },
    put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default adminApi;
