import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import adminApi, { clearAdminSession } from '../services/adminApi';
import { ADMIN_PERMISSIONS, ALL_PERMISSION_IDS } from '../constants/adminPermissions';

const ADMIN_SESSION_KEY = 'hemsely_admin_session:v1';

const AdminContext = createContext({
    admin: null,
    loading: true,
    isSuperAdmin: false,
    permissions: [],
    hasPermission: () => false,
    getFirstAllowedRoute: () => '/admin/profile',
    refreshAdminProfile: async () => {},
    authCheckError: '',
});

export const AdminProvider = ({ children, onUnauthorized }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authCheckError, setAuthCheckError] = useState('');

    const fetchAdmin = useCallback(async () => {
        setLoading(true);
        setAuthCheckError('');

        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');
        const refreshToken = sessionStorage.getItem('adminRefreshToken') || localStorage.getItem('adminRefreshToken');
        const sessionActive = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);

        if (!token && !refreshToken && !sessionActive) {
            setLoading(false);
            if (onUnauthorized) onUnauthorized();
            return;
        }

        try {
            const { data, ok, status } = await adminApi.get('/admin/me');
            if (ok && data.success && data.admin) {
                setAdmin(data.admin);
                setAuthCheckError('');
            } else if (status === 401) {
                clearAdminSession();
                if (onUnauthorized) onUnauthorized();
            } else if (status === 502 || status === 503 || status === 504) {
                setAuthCheckError(data?.message || `Server unavailable (${status} Bad Gateway). Please check if backend service is running.`);
            } else {
                setAuthCheckError(data?.message || 'Could not verify your session.');
            }
        } catch {
            setAuthCheckError('Network connection issue. Could not reach the backend server.');
        } finally {
            setLoading(false);
        }
    }, [onUnauthorized]);

    useEffect(() => {
        fetchAdmin();
    }, [fetchAdmin]);

    const isSuperAdmin = useMemo(() => admin?.role === 'superadmin', [admin?.role]);

    const permissions = useMemo(() => {
        if (isSuperAdmin) return ALL_PERMISSION_IDS;
        return Array.isArray(admin?.permissions) ? admin.permissions : [];
    }, [isSuperAdmin, admin?.permissions]);

    const hasPermission = useCallback(
        (permKey) => {
            if (!admin) return false;
            if (isSuperAdmin) return true;
            if (permKey === 'profile' || permKey === 'superadmin') return isSuperAdmin;

            const permList = Array.isArray(permKey) ? permKey : [permKey];
            return permList.some((p) => permissions.includes(p));
        },
        [admin, isSuperAdmin, permissions]
    );

    const getFirstAllowedRoute = useCallback(() => {
        if (isSuperAdmin) return '/admin/dashboard';
        const first = ADMIN_PERMISSIONS.find((p) => permissions.includes(p.id));
        return first ? first.path : '/admin/login';
    }, [isSuperAdmin, permissions]);

    const value = useMemo(
        () => ({
            admin,
            setAdmin,
            loading,
            isSuperAdmin,
            permissions,
            hasPermission,
            getFirstAllowedRoute,
            refreshAdminProfile: fetchAdmin,
            authCheckError,
        }),
        [admin, loading, isSuperAdmin, permissions, hasPermission, getFirstAllowedRoute, fetchAdmin, authCheckError]
    );

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

export default AdminContext;
