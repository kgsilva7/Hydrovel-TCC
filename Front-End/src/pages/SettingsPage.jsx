import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import { FaSave, FaBell, FaSlidersH, FaWater } from 'react-icons/fa';
import './styles.css';

const SettingsPage = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState({
        alert_notifications: {
            email: true,
            sms: false,
            push: true
        },
        thresholds: {
            flow: { min: 0, max: 100 },
            pressure: { min: 0, max: 60 },
            ph: { min: 6.5, max: 8.5 },
            turbidity: { min: 0, max: 5 },
            temperature: { min: 10, max: 35 }
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            fetchSettings();
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            const response = await api.get(`/api/users/${user.id}/settings`);
            if (response.data.settings) {
                setSettings(response.data.settings);
            }
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await api.put(`/api/users/${user.id}/settings`, { settings });
            setMessage('Configurações salvas com sucesso!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            setMessage('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    const handleNotificationChange = (key, value) => {
        setSettings({
            ...settings,
            alert_notifications: {
                ...settings.alert_notifications,
                [key]: value
            }
        });
    };

    const handleThresholdChange = (sensor, field, value) => {
        setSettings({
            ...settings,
            thresholds: {
                ...settings.thresholds,
                [sensor]: {
                    ...settings.thresholds[sensor],
                    [field]: parseFloat(value) || 0
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <Navbar />
                <main className="main-content">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="main-content">
                <div className="settings-page">
                    <div className="settings-header">
                        <h1>Configurações</h1>
                        <button 
                            className="settings-save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <FaSave /> {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {message && (
                        <div className={`settings-message ${message.includes('Erro') ? 'error' : 'success'}`}>
                            {message}
                        </div>
                    )}

                    <div className="settings-grid">
                        {/* Notificações */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <FaBell />
                                <h2>Notificações</h2>
                            </div>
                            <div className="settings-card-body">
                                <div className="settings-toggle">
                                    <label>Email</label>
                                    <input
                                        type="checkbox"
                                        checked={settings.alert_notifications.email}
                                        onChange={(e) => handleNotificationChange('email', e.target.checked)}
                                    />
                                </div>
                                <div className="settings-toggle">
                                    <label>SMS</label>
                                    <input
                                        type="checkbox"
                                        checked={settings.alert_notifications.sms}
                                        onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                                    />
                                </div>
                                <div className="settings-toggle">
                                    <label>Push (App)</label>
                                    <input
                                        type="checkbox"
                                        checked={settings.alert_notifications.push}
                                        onChange={(e) => handleNotificationChange('push', e.target.checked)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Limiares */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <FaSlidersH />
                                <h2>Limiares dos Sensores</h2>
                            </div>
                            <div className="settings-card-body">
                                {Object.entries(settings.thresholds).map(([sensor, values]) => (
                                    <div key={sensor} className="threshold-group">
                                        <h4>{sensor.charAt(0).toUpperCase() + sensor.slice(1)}</h4>
                                        <div className="threshold-inputs">
                                            <div className="threshold-input">
                                                <label>Min</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={values.min}
                                                    onChange={(e) => handleThresholdChange(sensor, 'min', e.target.value)}
                                                />
                                            </div>
                                            <div className="threshold-input">
                                                <label>Max</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={values.max}
                                                    onChange={(e) => handleThresholdChange(sensor, 'max', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Informações da Conta */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <FaWater />
                                <h2>Informações da Conta</h2>
                            </div>
                            <div className="settings-card-body">
                                <div className="info-item">
                                    <label>Nome</label>
                                    <p>{user?.name}</p>
                                </div>
                                <div className="info-item">
                                    <label>Email</label>
                                    <p>{user?.email}</p>
                                </div>
                                <div className="info-item">
                                    <label>Telefone</label>
                                    <p>{user?.phone || 'Não informado'}</p>
                                </div>
                                <div className="info-item">
                                    <label>Membro desde</label>
                                    <p>{new Date(user?.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SettingsPage;