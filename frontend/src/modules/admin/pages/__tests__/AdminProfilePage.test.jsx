import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminProfilePage from '../AdminProfilePage';
import adminApi from '../../services/adminApi';

// Regression guard for the bug where this page referenced undefined handlers
// (handleProfileSave, updateField, avatarInitials, etc.) and crashed immediately on mount.

vi.mock('../../services/adminApi', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('AdminProfilePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing and shows the loaded admin profile', async () => {
        adminApi.get.mockResolvedValue({
            ok: true,
            data: {
                success: true,
                admin: {
                    firstName: 'Ajay',
                    lastName: 'Panchal',
                    email: 'panchalajay717@gmail.com',
                    role: 'superadmin',
                    username: 'ajaypanchal',
                },
            },
        });

        render(<AdminProfilePage />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Ajay')).toBeInTheDocument();
        });

        expect(screen.getByDisplayValue('panchalajay717@gmail.com')).toBeInTheDocument();
        // Avatar initials computed from first/last name — this line alone used to throw.
        expect(screen.getByText('AP')).toBeInTheDocument();
    });
});
