import React, { useState, useEffect } from 'react';
import { useAlerts } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { FaCheckCircle, FaExclamationCircle, FaTimesCircle } from 'react-icons/fa';
import './styles.css';

const AlertList = ({ limit = 10 }) => {
    const { alerts, markAsRead, resolveAlert } = useAlerts();
    const { user } = useAuth();
    const [filteredAlerts, setFilteredAlerts] = useState([]);

    useEffect(() => {
        const sorted = [...alerts].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        setFilteredAlerts(sorted.slice(0, limit));
    }, [alerts, limit]);

    const getSeverityColor = (severity) => {
        const colors = {
            low: '#4CAF50',
            medium: '#FF9800',
            high: '#F44336',
            critical: '#D32F2F'
        };
        return colors[severity] || '#757575';
    };

    const getTypeIcon = (type) => {
        const icons = {
            leak: '💧',
            quality: '🔬',
            pressure: '📊',
            flow: '🌊',
            temperature: '🌡️'
        };
        return icons[type] || '⚠️';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleMarkAsRead = async (alertId) => {
        await markAsRead(alertId);
    };

    const handleResolve = async (alertId) => {
        await resolveAlert(alertId);
    };

    if (filteredAlerts.length === 0) {
        return (
            <div className="alert-list-empty">
                <FaCheckCircle size={48} color="#4CAF50" />
                <p>Nenhum alerta encontrado</p>
                <span>Sistema funcionando normalmente</span>
            </div>
        );
    }

    return (
        <div className="alert-list">
            {filteredAlerts.map(alert => (
                <div 
                    key={alert._id} 
                    className={`alert-item ${alert.read ? 'read' : 'unread'}`}
                    style={{ borderLeftColor: getSeverityColor(alert.severity) }}
                >
                    <div className="alert-icon">
                        {getTypeIcon(alert.type)}
                    </div>
                    <div className="alert-content">
                        <div className="alert-header">
                            <div className="alert-title">
                                <span className="alert-type">{alert.type}</span>
                                <span className="alert-severity" style={{ 
                                    background: getSeverityColor(alert.severity)
                                }}>
                                    {alert.severity.toUpperCase()}
                                </span>
                                {!alert.read && <span className="alert-unread">Novo</span>}
                            </div>
                            <span className="alert-time">{formatDate(alert.created_at)}</span>
                        </div>
                        <p className="alert-message">{alert.message}</p>
                        {alert.sensor_data && (
                            <div className="alert-sensor-data">
                                Sensor: {alert.sensor_data.sensor_type} | 
                                Valor: {alert.sensor_data.value}
                            </div>
                        )}
                        <div className="alert-actions">
                            {!alert.read && (
                                <button 
                                    className="alert-action-btn read-btn"
                                    onClick={() => handleMarkAsRead(alert._id)}
                                >
                                    Marcar como lido
                                </button>
                            )}
                            {!alert.resolved_at && (
                                <button 
                                    className="alert-action-btn resolve-btn"
                                    onClick={() => handleResolve(alert._id)}
                                >
                                    Resolver
                                </button>
                            )}
                            {alert.resolved_at && (
                                <span className="alert-resolved">
                                    ✅ Resolvido em {formatDate(alert.resolved_at)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AlertList;