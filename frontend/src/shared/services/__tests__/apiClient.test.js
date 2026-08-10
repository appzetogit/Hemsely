// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveUploadsUrls } from '../apiClient';

describe('resolveUploadsUrls', () => {
    it('rewrites relative /uploads paths to absolute backend URLs', () => {
        const result = resolveUploadsUrls('/uploads/amora/profiles/photo.png', 'http://localhost:5000');
        expect(result).toBe('http://localhost:5000/uploads/amora/profiles/photo.png');
    });

    it('rewrites uploads paths without leading slash or with /api/uploads prefix', () => {
        expect(resolveUploadsUrls('uploads/amora/profiles/photo.png', 'http://localhost:5000')).toBe(
            'http://localhost:5000/uploads/amora/profiles/photo.png'
        );
        expect(resolveUploadsUrls('/api/uploads/amora/profiles/photo.png', 'http://localhost:5000')).toBe(
            'http://localhost:5000/api/uploads/amora/profiles/photo.png'
        );
    });

    it('leaves non-upload strings untouched', () => {
        expect(resolveUploadsUrls('hello world')).toBe('hello world');
        expect(resolveUploadsUrls('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    });

    it('recurses into nested objects and arrays', () => {
        const input = {
            user: { profilePicture: '/uploads/a.png', name: 'Ajay' },
            gallery: [{ url: '/uploads/b.png' }, { url: '/uploads/c.png' }],
        };
        const result = resolveUploadsUrls(input, 'http://localhost:5000');
        expect(result.user.profilePicture).toBe('http://localhost:5000/uploads/a.png');
        expect(result.gallery[0].url).toBe('http://localhost:5000/uploads/b.png');
        expect(result.gallery[1].url).toBe('http://localhost:5000/uploads/c.png');
        expect(result.user.name).toBe('Ajay');
    });

    it('passes through null/undefined without throwing', () => {
        expect(resolveUploadsUrls(null)).toBeNull();
        expect(resolveUploadsUrls(undefined)).toBeUndefined();
    });
});

describe('apiClient.request', () => {
    beforeEach(() => {
        if (typeof localStorage === 'undefined') {
            const store = {};
            global.localStorage = {
                getItem: (key) => store[key] || null,
                setItem: (key, value) => { store[key] = String(value); },
                removeItem: (key) => { delete store[key]; },
                clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
            };
        } else {
            localStorage.clear();
        }
        if (typeof sessionStorage === 'undefined') {
            const store = {};
            global.sessionStorage = {
                getItem: (key) => store[key] || null,
                setItem: (key, value) => { store[key] = String(value); },
                removeItem: (key) => { delete store[key]; },
                clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
            };
        } else {
            sessionStorage.clear();
        }
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('attaches the Authorization header when a token is stored', async () => {
        localStorage.setItem('token', 'abc123');
        const fetchMock = vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            json: async () => ({ success: true }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const { apiClient } = await import('../apiClient');
        await apiClient.get('/users/me');

        const [, config] = fetchMock.mock.calls[0];
        expect(config.headers.Authorization).toBe('Bearer abc123');
    });

    it('on a 401, refreshes the token and retries the original request with the new token', async () => {
        localStorage.setItem('token', 'old-token');
        localStorage.setItem('refreshToken', 'old-refresh');

        const fetchMock = vi.fn()
            // 1) original request -> 401
            .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) })
            // 2) refresh call -> success with new tokens
            .mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ success: true, token: 'new-token', refreshToken: 'new-refresh' }),
            })
            // 3) retried original request -> success
            .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ success: true, data: 'retried' }) });
        vi.stubGlobal('fetch', fetchMock);

        const { apiClient } = await import('../apiClient');
        const result = await apiClient.get('/users/me');

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(localStorage.getItem('token')).toBe('new-token');
        expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
        expect(result.ok).toBe(true);
        expect(result.data.data).toBe('retried');

        // The retried call should carry the freshly rotated token, not the stale one.
        const retriedCallHeaders = fetchMock.mock.calls[2][1].headers;
        expect(retriedCallHeaders.Authorization).toBe('Bearer new-token');
    });

    it('clears stored tokens when the refresh call itself fails', async () => {
        localStorage.setItem('token', 'old-token');
        localStorage.setItem('refreshToken', 'old-refresh');

        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) })
            .mockRejectedValueOnce(new Error('network down'));
        vi.stubGlobal('fetch', fetchMock);

        const { apiClient } = await import('../apiClient');
        const result = await apiClient.get('/users/me');

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        // Falls through to returning the original (401) response shape.
        expect(result.status).toBe(401);
    });
});
