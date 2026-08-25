import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import SensorCard from './SensorCard';
import AlertList from './AlertList';
import ConsumptionChart from './ConsumptionChart';
import './styles.css';
import { 
    FaWater, 
    FaTachometerAlt, 
    FaThermometerHalf,
    FaChartLine,
    FaExclamationTriangle,
    FaBell
} from 'react-icons/fa';

const Dashboard = () => {
    const { user } = useAuth();
    const { unreadCount } = useAlerts();
    const { connected } = useSocket();
    const [sensorData, setSensorData] = useState({});
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [prediction, setPrediction] = useState(null);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
            fetchPrediction();
            // Atualizar a cada 30 segundos
            const interval = setInterval(fetchDashboardData, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get(`/api/sensors/${user.id}/dashboard`);
            setDashboard(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            setLoading(false);
        }
    };

    const fetchPrediction = async () => {
        try {
            const response = await api.get(`/api/sensors/${user.id}/prediction`);
            setPrediction(response.data);
        } catch (error) {
            console.error('Erro ao carregar predição:', error);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Carregando dados...</p>
            </div>
        );
    }

    const getSensorValue = (type) => {
        const sensor = dashboard?.lastReadings?.find(r => r._id === type);
        return sensor ? sensor.value : '--';
    };

    const getSensorUnit = (type) => {
        const units = {
            flow: 'L/min',
            pressure: 'kPa',
            ph: '',
            turbidity: 'NTU',
            temperature: '°C'
        };
        return units[type] || '';
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <h1>Dashboard Hydrovel</h1>
                <div className="dashboard-status">
                    <span className={`status-indicator ${connected ? 'online' : 'offline'}`}>
                        {connected ? '🟢 Online' : '🔴 Offline'}
                    </span>
                    <div className="alert-indicator" onClick={() => window.location.href = '/alertas'}>
                        <FaBell />
                        {unreadCount > 0 && (
                            <span className="alert-badge">{unreadCount}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Cards de Sensores */}
            <div className="sensor-grid">
                <SensorCard
                    title="Fluxo de Água"
                    value={getSensorValue('flow')}
                    unit="L/min"
                    icon={FaWater}
                    color="#2196F3"
                    status={getSensorValue('flow') > 50 ? 'warning' : 'normal'}
                />
                <SensorCard
                    title="Pressão"
                    value={getSensorValue('pressure')}
                    unit="kPa"
                    icon={FaTachometerAlt}
                    color="#4CAF50"
                    status={getSensorValue('pressure') > 60 ? 'warning' : 'normal'}
                />
                <SensorCard
                    title="Temperatura"
                    value={getSensorValue('temperature')}
                    unit="°C"
                    icon={FaThermometerHalf}
                    color="#FF9800"
                    status={getSensorValue('temperature') > 35 ? 'warning' : 'normal'}
                />
                <SensorCard
                    title="pH"
                    value={getSensorValue('ph')}
                    unit=""
                    icon={FaChartLine}
                    color="#9C27B0"
                    status={getSensorValue('ph') < 6.5 || getSensorValue('ph') > 8.5 ? 'warning' : 'normal'}
                />
                <SensorCard
                    title="Turbidez"
                    value={getSensorValue('turbidity')}
                    unit="NTU"
                    icon={FaExclamationTriangle}
                    color="#F44336"
                    status={getSensorValue('turbidity') > 5 ? 'warning' : 'normal'}
                />
            </div>

            {/* Gráfico de Consumo */}
            <div className="dashboard-chart">
                <h2>Consumo de Água</h2>
                {dashboard?.consumption && (
                    <ConsumptionChart data={dashboard.consumption} />
                )}
            </div>

            {/* Predição de Vazamento */}
            {prediction && (
                <div className="prediction-card">
                    <h2>🔍 Análise Preditiva</h2>
                    <div className="prediction-content">
                        <div className="prediction-probability">
                            <div className="probability-bar">
                                <div 
                                    className="probability-fill"
                                    style={{ 
                                        width: `${prediction.probability}%`,
                                        background: prediction.probability > 70 
                                            ? '#F44336' 
                                            : prediction.probability > 40 
                                            ? '#FF9800' 
                                            : '#4CAF50'
                                    }}
                                ></div>
                            </div>
                            <span className="probability-text">
                                {prediction.probability}% de probabilidade de vazamento
                            </span>
                        </div>
                        <p className="prediction-message">{prediction.message}</p>
                        {prediction.suspiciousHours?.length > 0 && (
                            <div className="suspicious-hours">
                                <h4>Horários suspeitos:</h4>
                                <ul>
                                    {prediction.suspiciousHours.slice(0, 5).map((hour, index) => (
                                        <li key={index}>
                                            {new Date(hour.timestamp).toLocaleTimeString('pt-BR')} - 
                                            Fluxo: {hour.value.toFixed(1)} L/min 
                                            (Esperado: {hour.expected.toFixed(1)} L/min)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Últimos Alertas */}
            <div className="dashboard-alerts">
                <h2>Alertas Recentes</h2>
                <AlertList limit={5} />
            </div>
        </div>
    );
};

export default Dashboard;