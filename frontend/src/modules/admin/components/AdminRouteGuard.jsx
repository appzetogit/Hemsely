import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Home } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Button } from '../../../shared/components/ui/Button';

export const AdminRouteGuard = ({ permission, children }) => {
    const { loading, hasPermission, getFirstAllowedRoute } = useAdmin();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
            </div>
        );
    }

    if (!permission || hasPermission(permission)) {
        return <>{children}</>;
    }

    const fallbackRoute = getFirstAllowedRoute();

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
                <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Access Restricted</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500 leading-relaxed">
                You do not have permission to view or manage this section. Your account access is restricted by the Superadmin.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Button
                    onClick={() => navigate(fallbackRoute)}
                    className="gap-2 shadow-sm"
                >
                    <span>Go to Allowed Section</span>
                    <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                    variant="outline"
                    onClick={() => navigate('/admin/profile')}
                    className="gap-2"
                >
                    <Home className="w-4 h-4" />
                    <span>My Profile</span>
                </Button>
            </div>
        </div>
    );
};

export default AdminRouteGuard;
