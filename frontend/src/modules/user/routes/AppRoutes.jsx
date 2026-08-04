import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from '../pages/SplashScreen';
import PrivateRoute from '../components/PrivateRoute';

const LoginScreen = lazy(() => import('../pages/LoginScreen'));
const PhoneInputPage = lazy(() => import('../pages/PhoneInputPage'));
const VerifyOTPPage = lazy(() => import('../pages/VerifyOTPPage'));
const ProfileDetailsPage = lazy(() => import('../pages/ProfileDetailsPage'));
const GenderSelectionPage = lazy(() => import('../pages/GenderSelectionPage'));
const AddPhotosPage = lazy(() => import('../pages/AddPhotosPage'));
const EnableLocationPage = lazy(() => import('../pages/EnableLocationPage'));
const InterestsPage = lazy(() => import('../pages/InterestsPage'));
const RelationshipGoalsPage = lazy(() => import('../pages/RelationshipGoalsPage'));
const ReviewProfilePage = lazy(() => import('../pages/ReviewProfilePage'));
const MatchSuccessPage = lazy(() => import('../pages/MatchSuccessPage'));
const ProfilePreviewPage = lazy(() => import('../pages/ProfilePreviewPage'));
const DiscoveryPage = lazy(() => import('../pages/DiscoveryPage'));
const ProfileDetailPage = lazy(() => import('../pages/ProfileDetailPage'));
const EditProfilePage = lazy(() => import('../pages/EditProfilePage'));
const PremiumPage = lazy(() => import('../pages/PremiumPage'));
const ChatListPage = lazy(() => import('../pages/ChatListPage'));
const ChatScreenPage = lazy(() => import('../pages/ChatScreenPage'));
const LikesYouPage = lazy(() => import('../pages/LikesYouPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const BlockedAccountsPage = lazy(() => import('../pages/BlockedAccountsPage'));
const SupportPage = lazy(() => import('../pages/SupportPage'));
const MeasurementUnitsPage = lazy(() => import('../pages/MeasurementUnitsPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('../pages/TermsOfServicePage'));

const AdminLoginPage = lazy(() => import('../../admin/pages/AdminLoginPage'));
const AdminLayout = lazy(() => import('../../admin/components/AdminLayout'));
const DashboardPage = lazy(() => import('../../admin/pages/DashboardPage'));
const ModerationPage = lazy(() => import('../../admin/pages/ModerationPage'));
const SelfieVerificationPage = lazy(() => import('../../admin/pages/SelfieVerificationPage'));
const UsersPage = lazy(() => import('../../admin/pages/UsersPage'));
const SubscriptionsPage = lazy(() => import('../../admin/pages/SubscriptionsPage'));
const BoostEditPage = lazy(() => import('../../admin/pages/BoostEditPage'));
const SubscriptionUsersPage = lazy(() => import('../../admin/pages/SubscriptionUsersPage'));
const QueueManagementPage = lazy(() => import('../../admin/pages/QueueManagementPage'));
const TransactionsPage = lazy(() => import('../../admin/pages/TransactionsPage'));
const ReportsPage = lazy(() => import('../../admin/pages/ReportsPage'));
const NotificationsPage = lazy(() => import('../../admin/pages/NotificationsPage'));
const AppConfigPage = lazy(() => import('../../admin/pages/AppConfigPage'));
const AdminProfilePage = lazy(() => import('../../admin/pages/AdminProfilePage'));
const WebsitePageEditorPage = lazy(() => import('../../admin/pages/WebsitePageEditorPage'));
const SupportManagementPage = lazy(() => import('../../admin/pages/SupportManagementPage'));

const RouteFallback = () => (
    <div className="h-[100dvh] flex items-center justify-center" style={{ background: '#FCFCFC' }}>
        <div className="w-8 h-8 rounded-full border-4 border-[#F0EBFB] border-t-[#6F3BCE] animate-spin" />
    </div>
);

const AppRoutes = () => {
    return (
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/" element={<SplashScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/phone-input" element={<PhoneInputPage />} />
                <Route path="/verify" element={<VerifyOTPPage />} />
                <Route path="/profile-details" element={<ProfileDetailsPage />} />
                <Route path="/gender-select" element={<GenderSelectionPage />} />
                <Route path="/add-photos" element={<AddPhotosPage />} />
                <Route path="/enable-location" element={<EnableLocationPage />} />
                <Route path="/interests" element={<InterestsPage />} />
                <Route path="/relationship-goals" element={<RelationshipGoalsPage />} />
                <Route path="/review-profile" element={<ReviewProfilePage />} />
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
                    <Route path="queue-management" element={<QueueManagementPage />} />
                    <Route path="transactions" element={<TransactionsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="app-config" element={<AppConfigPage />} />
                    <Route path="website-pages/:slug" element={<WebsitePageEditorPage />} />
                    <Route path="profile" element={<AdminProfilePage />} />
                </Route>
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
