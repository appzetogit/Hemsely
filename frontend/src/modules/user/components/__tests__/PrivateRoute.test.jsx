// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../PrivateRoute';

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

const renderWithRouter = (initialPath = '/discovery') =>
    render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route path="/login" element={<div>Login Screen</div>} />
                <Route
                    path="/discovery"
                    element={
                        <PrivateRoute>
                            <div>Protected Content</div>
                        </PrivateRoute>
                    }
                />
            </Routes>
        </MemoryRouter>
    );

describe('PrivateRoute', () => {
    beforeEach(() => {
        if (typeof localStorage !== 'undefined') localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('redirects to /login when there is no user and no token', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });

        renderWithRouter();

        expect(screen.getByText('Login Screen')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to /login when a user object exists but the token was cleared', () => {
        mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
        // No token set in localStorage — simulates a stale/cleared session.

        renderWithRouter();

        expect(screen.getByText('Login Screen')).toBeInTheDocument();
    });

    it('renders protected content when both user and token are present', () => {
        localStorage.setItem('token', 'valid-token');
        mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });

        renderWithRouter();

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders nothing while auth state is still loading', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });

        const { container } = renderWithRouter();

        expect(container).toBeEmptyDOMElement();
    });
});
