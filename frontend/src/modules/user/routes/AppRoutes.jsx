import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from '../pages/LandingPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import TermsOfServicePage from '../pages/TermsOfServicePage';

// Admin Pages
import AdminLoginPage from '../../admin/pages/AdminLoginPage';
import { ADMIN_LOGIN_PATH } from '../../admin/constants/adminRoutes';
import AdminLayout from '../../admin/components/AdminLayout';
import AdminRouteGuard from '../../admin/components/AdminRouteGuard';
import DashboardPage from '../../admin/pages/DashboardPage';
import ModerationPage from '../../admin/pages/ModerationPage';
import SelfieVerificationPage from '../../admin/pages/SelfieVerificationPage';
import ReportsPage from '../../admin/pages/ReportsPage';
import UsersPage from '../../admin/pages/UsersPage';
import SubscriptionsPage from '../../admin/pages/SubscriptionsPage';
import BoostEditPage from '../../admin/pages/BoostEditPage';
import SubscriptionUsersPage from '../../admin/pages/SubscriptionUsersPage';
import TransactionsPage from '../../admin/pages/TransactionsPage';
import NotificationsPage from '../../admin/pages/NotificationsPage';
import AppConfigPage from '../../admin/pages/AppConfigPage';
import AppLinksPage from '../../admin/pages/AppLinksPage';
import AdminProfilePage from '../../admin/pages/AdminProfilePage';
import WebsitePageEditorPage from '../../admin/pages/WebsitePageEditorPage';
import SupportManagementPage from '../../admin/pages/SupportManagementPage';

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Landing Page & Legal Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />

            {/* Legacy user routes redirect cleanly to the Landing Page */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/phone-input" element={<Navigate to="/" replace />} />
            <Route path="/verify" element={<Navigate to="/" replace />} />
            <Route path="/profile-details" element={<Navigate to="/" replace />} />
            <Route path="/gender-select" element={<Navigate to="/" replace />} />
            <Route path="/add-photos" element={<Navigate to="/" replace />} />
            <Route path="/selfie-verification" element={<Navigate to="/" replace />} />
            <Route path="/selfie-verify" element={<Navigate to="/" replace />} />
            <Route path="/enable-location" element={<Navigate to="/" replace />} />
            <Route path="/interests" element={<Navigate to="/" replace />} />
            <Route path="/relationship-goals" element={<Navigate to="/" replace />} />
            <Route path="/review-profile" element={<Navigate to="/" replace />} />
            <Route path="/match-success" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={<Navigate to="/" replace />} />
            <Route path="/profile-preview" element={<Navigate to="/" replace />} />
            <Route path="/discovery" element={<Navigate to="/" replace />} />
            <Route path="/profile-detail/:userId" element={<Navigate to="/" replace />} />
            <Route path="/edit-profile" element={<Navigate to="/" replace />} />
            <Route path="/premium" element={<Navigate to="/" replace />} />
            <Route path="/chats" element={<Navigate to="/" replace />} />
            <Route path="/chat/:userId" element={<Navigate to="/" replace />} />
            <Route path="/likes" element={<Navigate to="/" replace />} />
            <Route path="/settings" element={<Navigate to="/" replace />} />
            <Route path="/blocked-accounts" element={<Navigate to="/" replace />} />
            <Route path="/support" element={<Navigate to="/" replace />} />
            <Route path="/measurement-units" element={<Navigate to="/" replace />} />

            {/* Obfuscated Secret Admin Login Route */}
            <Route path={ADMIN_LOGIN_PATH} element={<AdminLoginPage />} />
            {/* Legacy/Public /admin/login redirect to protect admin panel */}
            <Route path="/admin/login" element={<Navigate to="/" replace />} />

            {/* Protected Admin Console Routes */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminRouteGuard permission="dashboard"><DashboardPage /></AdminRouteGuard>} />
                <Route path="users" element={<AdminRouteGuard permission="users"><UsersPage /></AdminRouteGuard>} />
                <Route path="moderation" element={<AdminRouteGuard permission="moderation"><ModerationPage /></AdminRouteGuard>} />
                <Route path="selfie-verification" element={<AdminRouteGuard permission="selfie-verification"><SelfieVerificationPage /></AdminRouteGuard>} />
                <Route path="reports" element={<AdminRouteGuard permission="reports"><ReportsPage /></AdminRouteGuard>} />
                <Route path="support" element={<AdminRouteGuard permission="support"><SupportManagementPage /></AdminRouteGuard>} />
                <Route path="subscriptions" element={<AdminRouteGuard permission="subscriptions"><SubscriptionsPage /></AdminRouteGuard>} />
                <Route path="boost-edit" element={<AdminRouteGuard permission="boost-edit"><BoostEditPage /></AdminRouteGuard>} />
                <Route path="subscription-users" element={<AdminRouteGuard permission="subscription-users"><SubscriptionUsersPage /></AdminRouteGuard>} />
                <Route path="transactions" element={<AdminRouteGuard permission="transactions"><TransactionsPage /></AdminRouteGuard>} />
                <Route path="notifications" element={<AdminRouteGuard permission="notifications"><NotificationsPage /></AdminRouteGuard>} />
                <Route path="app-config" element={<AdminRouteGuard permission="app-config"><AppConfigPage /></AdminRouteGuard>} />
                <Route path="app-links" element={<AdminRouteGuard permission="app-links"><AppLinksPage /></AdminRouteGuard>} />
                <Route path="website-pages/:slug" element={<AdminRouteGuard permission="website-pages"><WebsitePageEditorPage /></AdminRouteGuard>} />
                <Route path="profile" element={<AdminRouteGuard permission="superadmin"><AdminProfilePage /></AdminRouteGuard>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
