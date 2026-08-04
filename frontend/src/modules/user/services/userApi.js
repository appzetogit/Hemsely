import apiClient from '../../../shared/services/apiClient';
import { devLog, devWarn, devError } from '../../../shared/utils/logger';

/**
 * Update user profile details in MongoDB
 */
export const updateUserProfile = async (userId, updateData) => {
    try {
        // Always target 'me' so the endpoint relies on JWT authentication token
        const response = await apiClient.put('/users/me', updateData);
        if (response.data && response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
            if (response.data.user._id) {
                localStorage.setItem('userId', response.data.user._id);
            }
        }
        return response.data;
    } catch (error) {
        devError('Error updating user profile in MongoDB:', error?.response?.data || error.message);
        throw error;
    }
};

/**
 * Gather all onboarding state from localStorage and sync directly to MongoDB
 */
export const syncFullOnboardingData = async () => {
    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = storedUser._id || storedUser.id || localStorage.getItem('userId');

        if (!userId) {
            devWarn('Cannot sync onboarding data: User is not logged in or missing userId.');
            return null;
        }

        const profileData = JSON.parse(localStorage.getItem('onboarding_profile:v1') || '{}');
        const genderData = JSON.parse(localStorage.getItem('onboarding_gender:v1') || '{}');
        const locationData = JSON.parse(localStorage.getItem('onboarding_location:v1') || '{}');
        const interestsData = JSON.parse(localStorage.getItem('onboarding_interests:v1') || '[]');
        const goalsData = localStorage.getItem('onboarding_goals:v1') || '';

        // Note: profilePicture/galleryImages are uploaded directly via the real
        // multipart endpoints in AddPhotosPage, so they're intentionally not
        // touched here to avoid clobbering server-side gallery image _ids.
        const payload = {
            isProfileComplete: true,
        };

        if (profileData.name) {
            payload.name = profileData.name;
        }
        if (profileData.dob) {
            payload.dob = profileData.dob;
        }

        if (genderData.userGender && typeof genderData.userGender === 'string') {
            payload.gender = genderData.userGender.toLowerCase();
        }
        if (genderData.interestedIn) {
            if (Array.isArray(genderData.interestedIn)) {
                payload.interestedIn = genderData.interestedIn.map(g => String(g).toLowerCase());
            } else if (typeof genderData.interestedIn === 'string') {
                payload.interestedIn = [genderData.interestedIn.toLowerCase()];
            }
        }

        if (Array.isArray(interestsData) && interestsData.length > 0) {
            payload.interests = interestsData;
        }

        if (goalsData) {
            payload.relationshipGoal = goalsData;
        }

        if (locationData.lat && locationData.lng) {
            payload.location = {
                coordinates: {
                    type: 'Point',
                    coordinates: [locationData.lng, locationData.lat],
                },
                address: locationData.address || '',
                city: locationData.city || '',
                state: locationData.state || '',
            };
        }

        devLog('Syncing full onboarding payload for user:', userId, payload);
        const result = await updateUserProfile(userId, payload);
        return result;
    } catch (error) {
        devError('Failed to sync full onboarding data to MongoDB:', error);
        return null;
    }
};

export const requestAccountDeletionOtp = async (userId) => {
    try {
        return await apiClient.post(`/users/${userId}/request-delete-otp`, {});
    } catch (error) {
        devError('Error requesting account deletion OTP:', error);
        throw error;
    }
};

export const deleteUserProfile = async (userId, otp) => {
    try {
        const res = await apiClient.delete(`/users/${userId}`, {
            body: JSON.stringify({ otp }),
        });
        return res;
    } catch (error) {
        devError('Error deleting user profile:', error);
        throw error;
    }
};
