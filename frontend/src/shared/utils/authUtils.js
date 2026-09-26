/**
 * Helper utility to reliably retrieve the current authenticated user's ID
 * across localStorage and sessionStorage.
 */
export const getCurrentUserId = () => {
    try {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userStr) {
            const parsed = JSON.parse(userStr);
            if (parsed._id || parsed.id) {
                return String(parsed._id || parsed.id);
            }
        }
    } catch {
        // Fall back to direct ID retrieval if JSON parsing fails
    }
    return String(sessionStorage.getItem('userId') || localStorage.getItem('userId') || '');
};
