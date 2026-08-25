import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './context/AuthContext';

// Páginas
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';

// Componente de rota protegida
const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return <div className="loading-screen">Carregando...</div>;
    }
    
    return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={
                <PrivateRoute>
                    <DashboardPage />
                </PrivateRoute>
            } />
            <Route path="/alertas" element={
                <PrivateRoute>
                    <AlertsPage />
                </PrivateRoute>
            } />
            <Route path="/configuracoes" element={
                <PrivateRoute>
                    <SettingsPage />
                </PrivateRoute>
            } />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <SocketProvider>
                    <AlertProvider>
                        <AppRoutes />
                        <ToastContainer />
                    </AlertProvider>
                </SocketProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;