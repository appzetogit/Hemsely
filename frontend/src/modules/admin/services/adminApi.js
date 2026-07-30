import { API_BASE_URL, resolveUploadsUrls } from '../../../shared/services/apiClient';

const ADMIN_TOKEN_KEY = 'amora_admin_token';

const request = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(url, { ...options, headers, credentials: 'include' });

    if (response.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem('amora_admin_session:v1');
        if (!window.location.pathname.startsWith('/admin/login')) {
            window.location.href = '/admin/login';
        }
    }

    let data = {};
    try {
        data = resolveUploadsUrls(await response.json());
    } catch {
        // empty body
    }

    return { data, status: response.status, ok: response.ok };
};

export const adminApi = {
    get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options = {}) => {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        return request(endpoint, { ...options, method: 'POST', body: isFormData ? body : JSON.stringify(body) });
    },
    put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default adminApi;
