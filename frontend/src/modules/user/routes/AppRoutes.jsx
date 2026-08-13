import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../pages/LoginScreen';
import PhoneInputPage from '../pages/PhoneInputPage';
import VerifyOTPPage from '../pages/VerifyOTPPage';
import ProfileDetailsPage from '../pages/ProfileDetailsPage';
import GenderSelectionPage from '../pages/GenderSelectionPage';
import AddPhotosPage from '../pages/AddPhotosPage';
import EnableLocationPage from '../pages/EnableLocationPage';
import InterestsPage from '../pages/InterestsPage';
import RelationshipGoalsPage from '../pages/RelationshipGoalsPage';
import ReviewProfilePage from '../pages/ReviewProfilePage';
import MatchSuccessPage from '../pages/MatchSuccessPage';
import ProfilePreviewPage from '../pages/ProfilePreviewPage';
import DiscoveryPage from '../pages/DiscoveryPage';
import ProfileDetailPage from '../pages/ProfileDetailPage';
import EditProfilePage from '../pages/EditProfilePage';
import PremiumPage from '../pages/PremiumPage';
import ChatListPage from '../pages/ChatListPage';
import ChatScreenPage from '../pages/ChatScreenPage';
import LikesYouPage from '../pages/LikesYouPage';
import SettingsPage from '../pages/SettingsPage';
import BlockedAccountsPage from '../pages/BlockedAccountsPage';
import SupportPage from '../pages/SupportPage';
import MeasurementUnitsPage from '../pages/MeasurementUnitsPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import TermsOfServicePage from '../pages/TermsOfServicePage';

import AdminLoginPage from '../../admin/pages/AdminLoginPage';
import AdminLayout from '../../admin/components/AdminLayout';
import DashboardPage from '../../admin/pages/DashboardPage';
import ModerationPage from '../../admin/pages/ModerationPage';
import SelfieVerificationPage from '../../admin/pages/SelfieVerificationPage';
import UsersPage from '../../admin/pages/UsersPage';
import SubscriptionsPage from '../../admin/pages/SubscriptionsPage';
import BoostEditPage from '../../admin/pages/BoostEditPage';
import SubscriptionUsersPage from '../../admin/pages/SubscriptionUsersPage';
import TransactionsPage from '../../admin/pages/TransactionsPage';
import ReportsPage from '../../admin/pages/ReportsPage';
import NotificationsPage from '../../admin/pages/NotificationsPage';
import AppConfigPage from '../../admin/pages/AppConfigPage';
import AdminProfilePage from '../../admin/pages/AdminProfilePage';
import WebsitePageEditorPage from '../../admin/pages/WebsitePageEditorPage';
import SupportManagementPage from '../../admin/pages/SupportManagementPage';

const RouteFallback = () => (
    <div className="h-[100dvh] flex items-center justify-center" style={{ background: '#FCFCFC' }}>
        <div className="w-8 h-8 rounded-full border-4 border-[#F0EBFB] border-t-[#6F3BCE] animate-spin" />
    </div>
);

const RootRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return <RouteFallback />;
    const isAuthed = user && localStorage.getItem('token');
    return <Navigate to={isAuthed ? '/discovery' : '/login'} replace />;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/phone-input" element={<PhoneInputPage />} />
            <Route path="/verify" element={<VerifyOTPPage />} />
            <Route path="/profile-details" element={<PrivateRoute><ProfileDetailsPage /></PrivateRoute>} />
            <Route path="/gender-select" element={<PrivateRoute><GenderSelectionPage /></PrivateRoute>} />
            <Route path="/add-photos" element={<PrivateRoute><AddPhotosPage /></PrivateRoute>} />
            <Route path="/enable-location" element={<PrivateRoute><EnableLocationPage /></PrivateRoute>} />
            <Route path="/interests" element={<PrivateRoute><InterestsPage /></PrivateRoute>} />
            <Route path="/relationship-goals" element={<PrivateRoute><RelationshipGoalsPage /></PrivateRoute>} />
            <Route path="/review-profile" element={<PrivateRoute><ReviewProfilePage /></PrivateRoute>} />
            <Route path="/match-success" element={<MatchSuccessPage />} />
            <Route path="/profile" element={<PrivateRoute><ProfilePreviewPage /></PrivateRoute>} />
            <Route path="/profile-preview" element={<PrivateRoute><ProfilePreviewPage /></PrivateRoute>} />
            <Route path="/discovery" element={<PrivateRoute><DiscoveryPage /></PrivateRoute>} />
            <Route path="/profile-detail/:userId" element={<PrivateRoute><ProfileDetailPage /></PrivateRoute>} />
            <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
            <Route path="/premium" element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
            <Route path="/chats" element={<PrivateRoute><ChatListPage /></PrivateRoute>} />
            <Route path="/chat/:userId" element={<PrivateRoute><ChatScreenPage /></PrivateRoute>} />
            <Route path="/likes" element={<PrivateRoute><LikesYouPage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
            <Route path="/blocked-accounts" element={<PrivateRoute><BlockedAccountsPage /></PrivateRoute>} />
            <Route path="/support" element={<PrivateRoute><SupportPage /></PrivateRoute>} />
            <Route path="/measurement-units" element={<MeasurementUnitsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="moderation" element={<ModerationPage />} />
                <Route path="selfie-verification" element={<SelfieVerificationPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="support" element={<SupportManagementPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="boost-edit" element={<BoostEditPage />} />
                <Route path="subscription-users" element={<SubscriptionUsersPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="app-config" element={<AppConfigPage />} />
                <Route path="website-pages/:slug" element={<WebsitePageEditorPage />} />
                <Route path="profile" element={<AdminProfilePage />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
