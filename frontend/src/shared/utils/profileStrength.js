/**
 * Shared helper to calculate user profile strength consistently across the app.
 * Total: 100%
 * Balanced Breakdown:
 * - Add 4 photos: 25% (6.25% per photo up to 4)
 * - Answer 2 questions: 20% (10% per question up to 2)
 * - Add interests: 15%
 * - Add bio: 15%
 * - Add details: 15% (Work, Education, Religion, Height, Languages, Dating intentions)
 * - Add habits: 10% (Drinking, Smoking)
 * Total: 25 + 20 + 15 + 15 + 15 + 10 = 100%
 */

const isValidPhoto = (url) => url && typeof url === 'string' && !url.includes('wallet') && !url.includes('svg');

export const getProfileStrengthDetails = ({
    profilePicture = '',
    galleryImages = [],
    interests = [],
    prompts = [],
    bio = '',
    education = '',
    religion = '',
    profession = '',
    company = '',
    heightValue = '',
    height = null,
    languages = [],
    relationshipGoal = '',
    drinkingStatus = '',
    smokingStatus = '',
} = {}) => {
    // 1. Photos Count (25% total, 6.25% each up to 4)
    const validGalleryCount = Array.isArray(galleryImages)
        ? galleryImages.filter((g) => {
            const url = typeof g === 'string' ? g : g?.url;
            return isValidPhoto(url);
        }).length
        : 0;
    const photosCount = (isValidPhoto(profilePicture) ? 1 : 0) + validGalleryCount;
    const photoScore = Math.min(4, photosCount) * (25 / 4);
    const has4Photos = photosCount >= 4;

    // 2. Answered Questions (20% total, 10% each up to 2)
    const answeredPromptsCount = Array.isArray(prompts)
        ? prompts.filter((p) => p && typeof p.answer === 'string' && p.answer.trim().length > 0).length
        : 0;
    const questionScore = Math.min(2, answeredPromptsCount) * (20 / 2);
    const has2Questions = answeredPromptsCount >= 2;

    // 3. Interests (15%)
    const hasInterests = Array.isArray(interests) && interests.length > 0;
    const interestScore = hasInterests ? 15 : 0;

    // 4. Bio (15%)
    const hasBio = Boolean(bio && typeof bio === 'string' && bio.trim().length > 0);
    const bioScore = hasBio ? 15 : 0;

    // 5. Basic Details (15%)
    const hasHeight = Boolean(
        (heightValue && heightValue !== 'Not specified') ||
        (height && (typeof height === 'object' ? height.value : height) && height !== 'Not specified')
    );
    const hasLanguages = Boolean(
        languages &&
        languages !== 'Not specified' &&
        (Array.isArray(languages) ? languages.length > 0 : String(languages).trim().length > 0)
    );
    const hasEducation = Boolean(education && education !== 'Not specified');
    const hasReligion = Boolean(religion && religion !== 'Not specified');
    const hasWork = Boolean(
        (profession && profession !== 'Not specified') ||
        (company && company !== 'Not specified')
    );
    const hasRelationshipGoal = Boolean(relationshipGoal && relationshipGoal !== 'Not specified');

    const hasDetails = hasEducation || hasReligion || hasWork || hasHeight || hasLanguages || hasRelationshipGoal;
    const detailScore = hasDetails ? 15 : 0;

    // 6. Habits (10%)
    const hasDrinking = Boolean(drinkingStatus && drinkingStatus !== 'Not specified');
    const hasSmoking = Boolean(smokingStatus && smokingStatus !== 'Not specified');
    const hasHabits = hasDrinking || hasSmoking;
    const habitScore = hasHabits ? 10 : 0;

    const rawScore = photoScore + questionScore + interestScore + bioScore + detailScore + habitScore;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    return {
        score,
        photosCount,
        has4Photos,
        answeredPromptsCount,
        has2Questions,
        hasInterests,
        hasBio,
        hasDetails,
        hasHabits,
    };
};

export const calculateProfileStrength = (params) => {
    return getProfileStrengthDetails(params).score;
};
