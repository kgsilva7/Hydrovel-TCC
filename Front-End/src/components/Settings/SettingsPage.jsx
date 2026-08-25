import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';
import api from '../../services/api';
import Navbar from '../Common/Navbar';
import Footer from '../Common/Footer';
import { 
    FaSave, 
    FaBell, 
    FaSlidersH, 
    FaWater, 
    FaEnvelope, 
    FaSms, 
    FaMobileAlt,
    FaCheckCircle,
    FaExclamationTriangle,
    FaUser,
    FaShieldAlt,
    FaHistory,
    FaSync,
    FaTrash,
    FaEdit
} from 'react-icons/fa';
import './styles.css';

const SettingsPage = () => {
    const { user, updateUser } = useAuth();
    const { fetchAlerts } = useAlerts();
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
        },
        system: {
            auto_resolve: false,
            daily_report: true,
            maintenance_mode: false
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [activeTab, setActiveTab] = useState('notifications');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            fetchSettings();
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            const response = await api.get(`/api/users/${user.id}/settings`);
            if (response.data.settings) {
                setSettings(prev => ({
                    ...prev,
                    ...response.data.settings
                }));
            }
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            setLoading(false);
            setMessage({ 
                text: 'Erro ao carregar configurações', 
                type: 'error' 
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            await api.put(`/api/users/${user.id}/settings`, { settings });
            setMessage({ 
                text: 'Configurações salvas com sucesso!', 
                type: 'success' 
            });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            setMessage({ 
                text: 'Erro ao salvar configurações', 
                type: 'error' 
            });
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
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setSettings({
                ...settings,
                thresholds: {
                    ...settings.thresholds,
                    [sensor]: {
                        ...settings.thresholds[sensor],
                        [field]: numValue
                    }
                }
            });
        }
    };

    const handleSystemChange = (key, value) => {
        setSettings({
            ...settings,
            system: {
                ...settings.system,
                [key]: value
            }
        });
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const updateData = {
                name: formData.name,
                phone: formData.phone
            };

            if (formData.newPassword) {
                if (formData.newPassword !== formData.confirmPassword) {
                    setMessage({ text: 'As senhas não coincidem', type: 'error' });
                    setSaving(false);
                    return;
                }
                updateData.password = formData.newPassword;
                updateData.currentPassword = formData.currentPassword;
            }

            await api.put(`/api/users/${user.id}`, updateData);
            await updateUser(updateData);
            setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            setMessage({ 
                text: error.response?.data?.error || 'Erro ao atualizar perfil', 
                type: 'error' 
            });
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefault = async () => {
        if (window.confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
            const defaultSettings = {
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
                },
                system: {
                    auto_resolve: false,
                    daily_report: true,
                    maintenance_mode: false
                }
            };
            setSettings(defaultSettings);
            await handleSave();
        }
    };

    const getSensorLabel = (sensor) => {
        const labels = {
            flow: 'Fluxo (L/min)',
            pressure: 'Pressão (kPa)',
            ph: 'pH',
            turbidity: 'Turbidez (NTU)',
            temperature: 'Temperatura (°C)'
        };
        return labels[sensor] || sensor;
    };

    const getSensorIcon = (sensor) => {
        const icons = {
            flow: '💧',
            pressure: '📊',
            ph: '🧪',
            turbidity: '🌊',
            temperature: '🌡️'
        };
        return icons[sensor] || '📊';
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <Navbar />
                <main className="main-content">
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Carregando configurações...</p>
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
                        <div>
                            <h1>Configurações</h1>
                            <p className="settings-subtitle">
                                Gerencie suas preferências, limites do sistema e informações da conta
                            </p>
                        </div>
                        <div className="settings-actions">
                            <button 
                                className="settings-action-btn reset-btn"
                                onClick={handleResetToDefault}
                            >
                                <FaSync /> Restaurar Padrão
                            </button>
                            <button 
                                className="settings-save-btn"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                <FaSave /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`settings-message ${message.type}`}>
                            {message.type === 'success' ? (
                                <FaCheckCircle />
                            ) : (
                                <FaExclamationTriangle />
                            )}
                            {message.text}
                        </div>
                    )}

                    <div className="settings-tabs">
                        <button 
                            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <FaBell /> Notificações
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'thresholds' ? 'active' : ''}`}
                            onClick={() => setActiveTab('thresholds')}
                        >
                            <FaSlidersH /> Limiares
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                            onClick={() => setActiveTab('system')}
                        >
                            <FaShieldAlt /> Sistema
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                            onClick={() => setActiveTab('account')}
                        >
                            <FaUser /> Conta
                        </button>
                    </div>

                    <div className="settings-content">
                        {/* Aba de Notificações */}
                        {activeTab === 'notifications' && (
                            <div className="settings-card fade-in">
                                <div className="settings-card-header">
                                    <FaBell />
                                    <h2>Preferências de Notificação</h2>
                                </div>
                                <div className="settings-card-body">
                                    <p className="settings-description">
                                        Escolha como deseja receber alertas sobre seu sistema hidráulico
                                    </p>
                                    <div className="settings-toggle">
                                        <div className="toggle-info">
                                            <FaEnvelope className="toggle-icon" />
                                            <div>
                                                <label>Email</label>
                                                <p className="toggle-description">
                                                    Receba alertas por email
                                                </p>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.alert_notifications.email}
                                                onChange={(e) => 
                                                    handleNotificationChange('email', e.target.checked)
                                                }
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-toggle">
                                        <div className="toggle-info">
                                            <FaSms className="toggle-icon" />
                                            <div>
                                                <label>SMS</label>
                                                <p className="toggle-description">
                                                    Receba alertas por SMS (requer número de telefone)
                                                </p>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.alert_notifications.sms}
                                                onChange={(e) => 
                                                    handleNotificationChange('sms', e.target.checked)
                                                }
                                                disabled={!user?.phone}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-toggle">
                                        <div className="toggle-info">
                                            <FaMobileAlt className="toggle-icon" />
                                            <div>
                                                <label>Push (App)</label>
                                                <p className="toggle-description">
                                                    Receba notificações push no aplicativo
                                                </p>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.alert_notifications.push}
                                                onChange={(e) => 
                                                    handleNotificationChange('push', e.target.checked)
                                                }
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Aba de Limiares */}
                        {activeTab === 'thresholds' && (
                            <div className="settings-card fade-in">
                                <div className="settings-card-header">
                                    <FaSlidersH />
                                    <h2>Limiares dos Sensores</h2>
                                </div>
                                <div className="settings-card-body">
                                    <p className="settings-description">
                                        Defina os valores mínimos e máximos para cada sensor. 
                                        Quando um valor ultrapassar esses limites, um alerta será gerado.
                                    </p>
                                    <div className="thresholds-grid">
                                        {Object.entries(settings.thresholds).map(([sensor, values]) => (
                                            <div key={sensor} className="threshold-group">
                                                <div className="threshold-header">
                                                    <span className="threshold-icon">
                                                        {getSensorIcon(sensor)}
                                                    </span>
                                                    <h4>{getSensorLabel(sensor)}</h4>
                                                </div>
                                                <div className="threshold-inputs">
                                                    <div className="threshold-input">
                                                        <label>Mínimo</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={values.min}
                                                            onChange={(e) => 
                                                                handleThresholdChange(sensor, 'min', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="threshold-input">
                                                        <label>Máximo</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={values.max}
                                                            onChange={(e) => 
                                                                handleThresholdChange(sensor, 'max', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <div className="threshold-indicator">
                                                    <div className="indicator-bar">
                                                        <div 
                                                            className="indicator-fill"
                                                            style={{ 
                                                                width: '50%',
                                                                background: 'linear-gradient(to right, #4CAF50, #FF9800, #F44336)'
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="indicator-label">
                                                        {values.min} - {values.max}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Aba de Sistema */}
                        {activeTab === 'system' && (
                            <div className="settings-card fade-in">
                                <div className="settings-card-header">
                                    <FaShieldAlt />
                                    <h2>Configurações do Sistema</h2>
                                </div>
                                <div className="settings-card-body">
                                    <div className="settings-toggle">
                                        <div className="toggle-info">
                                            <div>
                                                <label>Resolução Automática</label>
                                                <p className="toggle-description">
                                                    Resolver alertas automaticamente quando o problema for corrigido
                                                </p>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.system.auto_resolve}
                                                onChange={(e) => 
                                                    handleSystemChange('auto_resolve', e.target.checked)
                                                }
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-toggle">
                                        <div className="toggle-info">
                                            <div>
                                                <label>Relatório Diário</label>
                                                <p className="toggle-description">
                                                    Receber relatório diário por email
                                                </p>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.system.daily_report}
                                                onChange={(e) => 
                                                    handleSystemChange('daily_report', e.target.checked)
                                                }
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-toggle">
                                        <div className="toggle-info">
                                            <div>
                                                <label>Modo Manutenção</label>
                                                <p className="toggle-description">
                                                    Desativar alertas durante manutenção programada
                                                </p>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.system.maintenance_mode}
                                                onChange={(e) => 
                                                    handleSystemChange('maintenance_mode', e.target.checked)
                                                }
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-info-box">
                                        <FaHistory />
                                        <div>
                                            <h4>Última atualização</h4>
                                            <p>{new Date().toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Aba de Conta */}
                        {activeTab === 'account' && (
                            <div className="settings-card fade-in">
                                <div className="settings-card-header">
                                    <FaUser />
                                    <h2>Informações da Conta</h2>
                                </div>
                                <div className="settings-card-body">
                                    <form onSubmit={handleProfileUpdate}>
                                        <div className="profile-form">
                                            <div className="form-group">
                                                <label>Nome completo</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        name: e.target.value
                                                    })}
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Email</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    disabled
                                                    className="disabled-input"
                                                />
                                                <span className="field-hint">Email não pode ser alterado</span>
                                            </div>

                                            <div className="form-group">
                                                <label>Telefone</label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        phone: e.target.value
                                                    })}
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>

                                            <div className="form-divider">
                                                <hr />
                                                <span>Alterar Senha</span>
                                                <hr />
                                            </div>

                                            <div className="form-group">
                                                <label>Senha atual</label>
                                                <input
                                                    type="password"
                                                    value={formData.currentPassword}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        currentPassword: e.target.value
                                                    })}
                                                    placeholder="Digite sua senha atual"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Nova senha</label>
                                                <input
                                                    type="password"
                                                    value={formData.newPassword}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        newPassword: e.target.value
                                                    })}
                                                    placeholder="Digite a nova senha"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Confirmar nova senha</label>
                                                <input
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        confirmPassword: e.target.value
                                                    })}
                                                    placeholder="Confirme a nova senha"
                                                />
                                            </div>

                                            <button 
                                                type="submit" 
                                                className="profile-update-btn"
                                                disabled={saving}
                                            >
                                                <FaEdit /> {saving ? 'Atualizando...' : 'Atualizar Perfil'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="profile-info">
                                        <div className="info-item">
                                            <label>Membro desde</label>
                                            <p>
                                                {user?.created_at 
                                                    ? new Date(user.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })
                                                    : 'Não disponível'
                                                }
                                            </p>
                                        </div>
                                        <div className="info-item">
                                            <label>Status da Conta</label>
                                            <p>
                                                <span className="status-badge active">
                                                    <FaCheckCircle /> Ativa
                                                </span>
                                            </p>
                                        </div>
                                        <div className="info-item">
                                            <label>Último acesso</label>
                                            <p>
                                                {user?.last_login 
                                                    ? new Date(user.last_login).toLocaleString('pt-BR')
                                                    : 'Não disponível'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SettingsPage;