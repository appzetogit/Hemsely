import { API_BASE_URL, resolveUploadsUrls } from '../../../shared/services/apiClient';

const request = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');

    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    // Auth is carried by both Authorization header and httpOnly adminToken cookie (credentials: 'include')
    const response = await fetch(url, { ...options, headers, credentials: 'include' });

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem('hemsely_admin_session:v1');
        sessionStorage.removeItem('adminToken');
        localStorage.removeItem('adminToken');
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
