// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';
import apiClient from '../../../../shared/services/apiClient';

vi.mock('../../../../shared/services/apiClient', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('LandingPage', () => {
    beforeEach(() => {
        if (typeof localStorage !== 'undefined') localStorage.clear();
        vi.resetAllMocks();
    });

    it('renders landing page headline, branding, and store download buttons', async () => {
        apiClient.get.mockResolvedValue({
            ok: true,
            data: {
                success: true,
                playStoreUrl: 'https://play.google.com/store/apps/details?id=com.hemsely.custom',
                appStoreUrl: 'https://apps.apple.com/app/hemsely/id999999999',
            },
        });

        render(
            <MemoryRouter>
                <LandingPage />
            </MemoryRouter>
        );

        expect(screen.getAllByText('Hemsely')[0]).toBeInTheDocument();
        expect(screen.getByText(/Find Meaningful Connections/i)).toBeInTheDocument();

        await waitFor(() => {
            const playLinks = screen.getAllByRole('link', { name: /Google Play/i });
            expect(playLinks.length).toBeGreaterThan(0);
            expect(playLinks[0]).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.hemsely.custom');
        });
    });
});

