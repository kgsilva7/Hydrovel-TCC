import React from 'react';
import { useAlerts } from '../../hooks/useAlerts';
import { 
    FaCheckCircle, 
    FaExclamationTriangle, 
    FaTimesCircle,
    FaWater,
    FaTachometerAlt,
    FaThermometerHalf,
    FaFlask,
    FaCheck,
    FaClock,
    FaInfoCircle
} from 'react-icons/fa';
import './styles.css';

const AlertItem = ({ alert, expanded = false, onClick, onClose }) => {
    const { markAsRead, resolveAlert } = useAlerts();

    const getSeverityColor = (severity) => {
        const colors = {
            low: '#4CAF50',
            medium: '#FF9800',
            high: '#F44336',
            critical: '#D32F2F'
        };
        return colors[severity] || '#757575';
    };

    const getSeverityIcon = (severity) => {
        const icons = {
            low: <FaInfoCircle />,
            medium: <FaExclamationTriangle />,
            high: <FaExclamationTriangle />,
            critical: <FaTimesCircle />
        };
        return icons[severity] || <FaInfoCircle />;
    };

    const getTypeIcon = (type) => {
        const icons = {
            leak: <FaWater />,
            quality: <FaFlask />,
            pressure: <FaTachometerAlt />,
            flow: <FaWater />,
            temperature: <FaThermometerHalf />
        };
        return icons[type] || <FaExclamationTriangle />;
    };

    const getTypeLabel = (type) => {
        const labels = {
            leak: 'Vazamento',
            quality: 'Qualidade',
            pressure: 'Pressão',
            flow: 'Fluxo',
            temperature: 'Temperatura'
        };
        return labels[type] || type;
    };

    const formatDate = (date) => {
        if (!date) return 'Data indisponível';
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeAgo = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Agora mesmo';
        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        return `${days}d atrás`;
    };

    const handleMarkAsRead = (e) => {
        e.stopPropagation();
        markAsRead(alert._id);
    };

    const handleResolve = (e) => {
        e.stopPropagation();
        resolveAlert(alert._id);
    };

    const severityColor = getSeverityColor(alert.severity);

    return (
        <div 
            className={`alert-item ${alert.read ? 'read' : 'unread'} ${expanded ? 'expanded' : ''}`}
            style={{ borderLeftColor: severityColor }}
            onClick={onClick}
        >
            <div className="alert-item-icon" style={{ background: severityColor }}>
                {getTypeIcon(alert.type)}
            </div>

            <div className="alert-item-content">
                <div className="alert-item-header">
                    <div className="alert-item-title">
                        <span className="alert-item-type">{getTypeLabel(alert.type)}</span>
                        <span 
                            className="alert-item-severity"
                            style={{ background: severityColor }}
                        >
                            {getSeverityIcon(alert.severity)}
                            {alert.severity.toUpperCase()}
                        </span>
                        {!alert.read && (
                            <span className="alert-item-unread">Novo</span>
                        )}
                        {alert.resolved_at && (
                            <span className="alert-item-resolved">
                                <FaCheck /> Resolvido
                            </span>
                        )}
                    </div>
                    <div className="alert-item-time">
                        <span className="time-ago">{getTimeAgo(alert.created_at)}</span>
                        <span className="time-full">{formatDate(alert.created_at)}</span>
                    </div>
                </div>

                <p className="alert-item-message">{alert.message}</p>

                {alert.sensor_data && (
                    <div className="alert-item-sensor">
                        <span className="sensor-label">Sensor:</span>
                        <span className="sensor-value">
                            {alert.sensor_data.sensor_type} = {alert.sensor_data.value}
                        </span>
                        {alert.sensor_data.threshold && (
                            <span className="sensor-threshold">
                                (Limite: {alert.sensor_data.threshold})
                            </span>
                        )}
                    </div>
                )}

                {expanded && (
                    <div className="alert-item-expanded">
                        <div className="expanded-details">
                            <div className="detail-row">
                                <span className="detail-label">ID:</span>
                                <span className="detail-value">{alert._id}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Tipo:</span>
                                <span className="detail-value">{alert.type}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Severidade:</span>
                                <span className="detail-value" style={{ color: severityColor }}>
                                    {alert.severity}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Criado em:</span>
                                <span className="detail-value">{formatDate(alert.created_at)}</span>
                            </div>
                            {alert.resolved_at && (
                                <div className="detail-row">
                                    <span className="detail-label">Resolvido em:</span>
                                    <span className="detail-value">{formatDate(alert.resolved_at)}</span>
                                </div>
                            )}
                            {alert.resolved_by && (
                                <div className="detail-row">
                                    <span className="detail-label">Resolvido por:</span>
                                    <span className="detail-value">Usuário {alert.resolved_by}</span>
                                </div>
                            )}
                        </div>

                        <div className="alert-item-actions">
                            {!alert.read && (
                                <button 
                                    className="alert-action-btn read-btn"
                                    onClick={handleMarkAsRead}
                                >
                                    <FaCheck /> Marcar como lido
                                </button>
                            )}
                            {!alert.resolved_at && (
                                <button 
                                    className="alert-action-btn resolve-btn"
                                    onClick={handleResolve}
                                >
                                    <FaCheckCircle /> Resolver
                                </button>
                            )}
                            {onClose && (
                                <button 
                                    className="alert-action-btn close-btn"
                                    onClick={onClose}
                                >
                                    <FaTimesCircle /> Fechar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {!expanded && !alert.read && (
                    <div className="alert-item-actions-mini">
                        <button 
                            className="alert-action-mini read-btn"
                            onClick={handleMarkAsRead}
                            title="Marcar como lido"
                        >
                            <FaCheck />
                        </button>
                        {!alert.resolved_at && (
                            <button 
                                className="alert-action-mini resolve-btn"
                                onClick={handleResolve}
                                title="Resolver"
                            >
                                <FaCheckCircle />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!expanded && alert.resolved_at && (
                <div className="alert-item-resolved-badge">
                    <FaCheckCircle />
                </div>
            )}
        </div>
    );
};

export default AlertItem;