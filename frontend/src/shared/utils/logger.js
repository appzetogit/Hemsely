// Thin console wrapper that only logs in development builds, so debug/error
// noise never ships to production consoles.
export const devLog = (...args) => {
    if (import.meta.env.DEV) console.log(...args);
};

export const devWarn = (...args) => {
    if (import.meta.env.DEV) console.warn(...args);
};

export const devError = (...args) => {
    if (import.meta.env.DEV) console.error(...args);
};
