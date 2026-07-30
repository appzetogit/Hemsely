import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (!user || !localStorage.getItem('token')) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default PrivateRoute;
