const FALLBACK_API_URL = 'http://localhost:5000/api';

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');

export const API_BASE_URL = normalizeBaseUrl(
    import.meta.env.VITE_API_URL?.trim() || FALLBACK_API_URL
);

export const BACKEND_ORIGIN = (() => {
    try {
        const url = new URL(API_BASE_URL);
        return url.origin;
    } catch {
        return 'http://localhost:5000';
    }
})();

const resolveUploadUrl = (urlStr) => {
    if (typeof urlStr !== 'string') return urlStr;
    if (urlStr.startsWith('/uploads/') && !urlStr.startsWith('//') && !urlStr.startsWith('data:')) {
        const baseOrigin = BACKEND_ORIGIN.endsWith('/') ? BACKEND_ORIGIN.slice(0, -1) : BACKEND_ORIGIN;
        return `${baseOrigin}${urlStr}`;
    }
    return urlStr;
};

/**
 * Recursively scans any API response payload and resolves relative /uploads paths
 * to absolute backend URLs. Bypasses File/Blob objects to protect frontend file uploading.
 */
export const resolveUploadsUrls = (obj, origin = BACKEND_ORIGIN) => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        if (obj.startsWith('/uploads/') && !obj.startsWith('//') && !obj.startsWith('data:')) {
            const baseOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
            return `${baseOrigin}${obj}`;
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => resolveUploadsUrls(item, origin));
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

export const buildApiUrl = (path = '') => {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalizedPath = String(path).replace(/^\/+/, '');
    return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL;
};

export const apiFetch = async (path, options = {}) => {
    const { headers, body, ...restOptions } = options;
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    const response = await fetch(buildApiUrl(path), {
        ...restOptions,
        body,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...headers,
        },
    });

    // Intercept response.json() to automatically resolve /uploads relative paths
    const originalJson = response.json.bind(response);
    response.json = async () => {
        const data = await originalJson();
        return resolveUploadsUrls(data, BACKEND_ORIGIN);
    };

    return response;
};
