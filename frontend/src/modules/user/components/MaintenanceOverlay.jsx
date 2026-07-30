import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const MaintenanceOverlay = () => {
    const [maintenance, setMaintenance] = useState(null);
    const { socket } = useSocket();
    const location = useLocation();

    useEffect(() => {
        const handleMaintenanceEvent = (data) => {
            if (!data) return;
            if (data.active) {
                setMaintenance({ message: data.message || 'The app is temporarily down for maintenance. Please check back soon.' });
            } else {
                setMaintenance(null);
            }
        };

        const handleDomEvent = (e) => {
            setMaintenance(e.detail || { message: 'The app is temporarily down for maintenance. Please check back soon.' });
        };

        window.addEventListener('app_maintenance_mode', handleDomEvent);

        if (socket) {
            socket.on('system:maintenance_mode', handleMaintenanceEvent);
        }

        return () => {
            window.removeEventListener('app_maintenance_mode', handleDomEvent);
            if (socket) {
                socket.off('system:maintenance_mode', handleMaintenanceEvent);
            }
        };
    }, [socket]);

    // Admin routes are strictly exempt from maintenance overlay
    if (location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/admin')) {
        return null;
    }

    if (!maintenance) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-24 h-24 rounded-3xl bg-[#F7EBFE] flex items-center justify-center mb-6 shadow-md">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#703DE2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-black mb-2 tracking-tight">
                Under Maintenance
            </h1>
            
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-8">
                {maintenance.message || "We're currently upgrading Hemeshly to give you a better experience. Please check back soon!"}
            </p>

            <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full max-w-xs h-12 rounded-full bg-[#703DE2] hover:bg-[#602ec3] text-white font-bold text-sm tracking-wider shadow-lg shadow-purple-200/80 cursor-pointer active:scale-95 transition-all border-0 flex items-center justify-center gap-2"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                CHECK AGAIN
            </button>
        </div>
    );
};

export default MaintenanceOverlay;
