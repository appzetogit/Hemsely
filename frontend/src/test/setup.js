import '@testing-library/jest-dom/vitest';

if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
        getItem: (key) => (key in store ? store[key] : null),
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    };
}

if (typeof globalThis.sessionStorage === 'undefined') {
    const store = {};
    globalThis.sessionStorage = {
        getItem: (key) => (key in store ? store[key] : null),
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    };
}
