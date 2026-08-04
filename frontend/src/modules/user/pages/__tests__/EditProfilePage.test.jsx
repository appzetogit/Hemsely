import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditProfilePage from '../EditProfilePage';
import apiClient from '../../../../shared/services/apiClient';

// Regression guard for the bug where this page referenced an undefined
// `userProfile` variable and crashed on every render.

vi.mock('../../../../shared/services/apiClient', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('EditProfilePage', () => {
    beforeEach(() => {
        localStorage.clear();
        // resetAllMocks (not clearAllMocks) - a mockResolvedValue set by one test
        // must not leak its implementation into the next test.
        vi.resetAllMocks();
    });

    it('renders without crashing and shows the loaded profile bio', async () => {
        localStorage.setItem('userId', 'user-1');
        apiClient.get.mockResolvedValue({
            ok: true,
            data: {
                success: true,
                user: {
                    _id: 'user-1',
                    bio: 'Hello from a real profile',
                    interests: ['Music'],
                    education: '',
                    religion: '',
                    height: null,
                    relationshipGoal: '',
                    drinkingStatus: '',
                    smokingStatus: '',
                    profilePicture: '',
                    galleryImages: [],
                },
            },
        });

        render(
            <MemoryRouter>
                <EditProfilePage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Hello from a real profile')).toBeInTheDocument();
        });

        expect(screen.getByText('Music')).toBeInTheDocument();
    });

    it('shows an error state instead of crashing when no user is logged in', async () => {
        // No userId in localStorage — this used to be the crash path.
        render(
            <MemoryRouter>
                <EditProfilePage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/need to be logged in/i)).toBeInTheDocument();
        });
    });
});
