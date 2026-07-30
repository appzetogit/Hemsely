import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import MaintenanceOverlay from './components/MaintenanceOverlay';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <MaintenanceOverlay />
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
