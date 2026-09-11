/**
 * Shared helper to calculate user profile strength consistently across the app.
 * Total: 100%
 * - At least 1 photo: +30%
 * - At least 4 photos: +10%
 * - Added interests: +20%
 * - Answered at least 2 questions (Mandatory): +20%
 * - Bio filled: +10%
 * - Details filled (Education / Religion / Profession / Company): +10%
 */
export const calculateProfileStrength = ({
    profilePicture = '',
    galleryImages = [],
    interests = [],
    prompts = [],
    bio = '',
    education = '',
    religion = '',
    profession = '',
    company = '',
} = {}) => {
    let score = 0;

    // 1. Photos Count (1 photo = +30%, 4+ photos = +10%)
    const photosCount = (profilePicture ? 1 : 0) + (Array.isArray(galleryImages) ? galleryImages.length : 0);
    if (photosCount >= 1) score += 30;
    if (photosCount >= 4) score += 10;

    // 2. Interests (+20%)
    if (Array.isArray(interests) && interests.length > 0) {
        score += 20;
    }

    // 3. Mandatory at least 2 questions answered (+20%)
    const answeredPromptsCount = Array.isArray(prompts)
        ? prompts.filter((p) => p && typeof p.answer === 'string' && p.answer.trim().length > 0).length
        : 0;
    if (answeredPromptsCount >= 2) {
        score += 20;
    }

    // 4. Bio (+10%)
    if (bio && typeof bio === 'string' && bio.trim().length > 0) {
        score += 10;
    }

    // 5. Basic Details (+10%)
    const hasDetail =
        (education && education !== 'Not specified') ||
        (religion && religion !== 'Not specified') ||
        (profession && profession !== 'Not specified') ||
        (company && company !== 'Not specified');
    if (hasDetail) {
        score += 10;
    }

    return Math.min(100, Math.max(0, score));
};
