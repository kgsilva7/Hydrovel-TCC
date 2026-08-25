import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../services/api';
import { toast } from 'react-toastify';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [alerts, setAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAlerts();
            fetchUnreadCount();
        }
    }, [user]);

    useEffect(() => {
        if (socket) {
            socket.on('new_alert', handleNewAlert);
            socket.on('alert_read', handleAlertRead);
            socket.on('alert_resolved', handleAlertResolved);

            return () => {
                socket.off('new_alert', handleNewAlert);
                socket.off('alert_read', handleAlertRead);
                socket.off('alert_resolved', handleAlertResolved);
            };
        }
    }, [socket]);

    const handleNewAlert = (alert) => {
        setAlerts(prev => [alert, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Notificação toast
        const severityColors = {
            low: 'info',
            medium: 'warning',
            high: 'error',
            critical: 'error'
        };
        toast[severityColors[alert.severity] || 'info'](
            `🚨 ${alert.message}`,
            {
                position: 'top-right',
                autoClose: 10000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true
            }
        );
    };

    const handleAlertRead = ({ alertId }) => {
        setAlerts(prev => prev.map(a => 
            a._id === alertId ? { ...a, read: true } : a
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleAlertResolved = ({ alertId }) => {
        setAlerts(prev => prev.map(a => 
            a._id === alertId ? { ...a, resolved_at: new Date() } : a
        ));
    };

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/alerts/${user.id}`);
            setAlerts(response.data.alerts);
        } catch (error) {
            console.error('Erro ao buscar alertas:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get(`/api/alerts/${user.id}/unread`);
            setUnreadCount(response.data.length);
        } catch (error) {
            console.error('Erro ao buscar contagem:', error);
        }
    };

    const markAsRead = async (alertId) => {
        try {
            await api.put(`/api/alerts/${alertId}/read`, { userId: user.id });
        } catch (error) {
            console.error('Erro ao marcar como lido:', error);
        }
    };

    const resolveAlert = async (alertId) => {
        try {
            await api.put(`/api/alerts/${alertId}/resolve`, { userId: user.id });
        } catch (error) {
            console.error('Erro ao resolver alerta:', error);
        }
    };

    return (
        <AlertContext.Provider value={{
            alerts,
            unreadCount,
            loading,
            fetchAlerts,
            markAsRead,
            resolveAlert,
            setAlerts
        }}>
            {children}
        </AlertContext.Provider>
    );
};

export const useAlerts = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlerts must be used within AlertProvider');
    }
    return context;
};