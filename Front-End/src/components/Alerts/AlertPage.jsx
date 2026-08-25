import React, { useState, useEffect, useMemo } from 'react';
import { useAlerts } from '../../hooks/useAlerts';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import AlertItem from './AlertItem';
import Navbar from '../Common/Navbar';
import Footer from '../Common/Footer';
import { 
    FaFilter, 
    FaDownload, 
    FaBell, 
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimes,
    FaChartBar,
    FaClock,
    FaWater
} from 'react-icons/fa';
import './styles.css';

const AlertsPage = () => {
    const { alerts, unreadCount, fetchAlerts, loading, markAsRead, resolveAlert } = useAlerts();
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showStats, setShowStats] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('list');

    useEffect(() => {
        if (user) {
            fetchAlerts();
        }
    }, [user]);

    // Listeners de socket para novos alertas
    useEffect(() => {
        if (socket && connected) {
            socket.on('new_alert', (alert) => {
                // O AlertContext já lida com isso, mas podemos adicionar feedback adicional
                console.log('🔔 Novo alerta recebido em tempo real:', alert);
            });

            return () => {
                socket.off('new_alert');
            };
        }
    }, [socket, connected]);

    const filteredAlerts = useMemo(() => {
        let filtered = alerts || [];

        // Aplicar filtro
        if (filter === 'unread') {
            filtered = filtered.filter(a => !a.read);
        } else if (filter === 'resolved') {
            filtered = filtered.filter(a => a.resolved_at !== null);
        } else if (filter === 'unresolved') {
            filtered = filtered.filter(a => a.resolved_at === null);
        } else if (filter === 'critical') {
            filtered = filtered.filter(a => a.severity === 'critical' || a.severity === 'high');
        } else if (filter === 'leak') {
            filtered = filtered.filter(a => a.type === 'leak');
        } else if (filter === 'quality') {
            filtered = filtered.filter(a => a.type === 'quality');
        }

        // Aplicar busca
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(a => 
                a.message?.toLowerCase().includes(term) ||
                a.type?.toLowerCase().includes(term) ||
                a.severity?.toLowerCase().includes(term) ||
                a._id?.toLowerCase().includes(term)
            );
        }

        // Ordenar
        filtered = [...filtered];
        if (sortBy === 'newest') {
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortBy === 'oldest') {
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (sortBy === 'severity') {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            filtered.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        }

        return filtered;
    }, [alerts, filter, searchTerm, sortBy]);

    const getStats = useMemo(() => {
        const total = alerts?.length || 0;
        const unread = alerts?.filter(a => !a.read).length || 0;
        const resolved = alerts?.filter(a => a.resolved_at !== null).length || 0;
        const critical = alerts?.filter(a => a.severity === 'critical' || a.severity === 'high').length || 0;
        const leak = alerts?.filter(a => a.type === 'leak').length || 0;
        const quality = alerts?.filter(a => a.type === 'quality').length || 0;

        return { total, unread, resolved, critical, leak, quality };
    }, [alerts]);

    const handleExport = () => {
        if (filteredAlerts.length === 0) return;

        // Criar CSV
        const headers = ['ID', 'Tipo', 'Severidade', 'Mensagem', 'Data', 'Status', 'Resolvido em'];
        const rows = filteredAlerts.map(alert => [
            alert._id,
            alert.type,
            alert.severity,
            alert.message,
            new Date(alert.created_at).toLocaleString('pt-BR'),
            alert.resolved_at ? 'Resolvido' : (alert.read ? 'Lido' : 'Não lido'),
            alert.resolved_at ? new Date(alert.resolved_at).toLocaleString('pt-BR') : ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `alertas_hydrovel_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(filteredAlerts, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `alertas_hydrovel_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const clearSearch = () => {
        setSearchTerm('');
    };

    const handleAlertAction = async (alertId, action) => {
        if (action === 'read') {
            await markAsRead(alertId);
        } else if (action === 'resolve') {
            await resolveAlert(alertId);
        }
    };

    const getFilterLabel = (filter) => {
        const labels = {
            all: 'Todos',
            unread: 'Não lidos',
            unresolved: 'Não resolvidos',
            resolved: 'Resolvidos',
            critical: 'Críticos',
            leak: 'Vazamentos',
            quality: 'Qualidade'
        };
        return labels[filter] || filter;
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <Navbar />
                <main className="main-content">
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Carregando alertas...</p>
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
                <div className="alerts-page">
                    {/* Header */}
                    <div className="alerts-header">
                        <div>
                            <h1>Alertas</h1>
                            <p className="alerts-subtitle">
                                <FaBell className="subtitle-icon" />
                                {alerts?.length || 0} alertas no total • 
                                <span className="unread-count">{unreadCount} não lidos</span>
                                {connected ? (
                                    <span className="status-online"> • 🟢 Conectado</span>
                                ) : (
                                    <span className="status-offline"> • 🔴 Desconectado</span>
                                )}
                            </p>
                        </div>
                        <div className="alerts-actions">
                            <button 
                                className={`alerts-action-btn ${showStats ? 'active' : ''}`}
                                onClick={() => setShowStats(!showStats)}
                            >
                                <FaChartBar /> Estatísticas
                            </button>
                            <div className="dropdown">
                                <button className="alerts-action-btn">
                                    <FaDownload /> Exportar
                                </button>
                                <div className="dropdown-menu">
                                    <button onClick={handleExport}>CSV</button>
                                    <button onClick={handleExportJSON}>JSON</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estatísticas */}
                    {showStats && (
                        <div className="alerts-stats slide-in">
                            <div className="stat-card">
                                <div className="stat-number">{getStats.total}</div>
                                <div className="stat-label">Total</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">{getStats.unread}</div>
                                <div className="stat-label">Não Lidos</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">{getStats.resolved}</div>
                                <div className="stat-label">Resolvidos</div>
                            </div>
                            <div className="stat-card critical">
                                <div className="stat-number">{getStats.critical}</div>
                                <div className="stat-label">Críticos</div>
                            </div>
                            <div className="stat-card leak">
                                <div className="stat-number">{getStats.leak}</div>
                                <div className="stat-label">Vazamentos</div>
                            </div>
                            <div className="stat-card quality">
                                <div className="stat-number">{getStats.quality}</div>
                                <div className="stat-label">Qualidade</div>
                            </div>
                        </div>
                    )}

                    {/* Controles */}
                    <div className="alerts-controls">
                        <div className="alerts-filters">
                            <div className="alerts-filter">
                                <FaFilter className="filter-icon" />
                                <select 
                                    value={filter} 
                                    onChange={(e) => setFilter(e.target.value)}
                                >
                                    <option value="all">Todos</option>
                                    <option value="unread">Não lidos</option>
                                    <option value="unresolved">Não resolvidos</option>
                                    <option value="resolved">Resolvidos</option>
                                    <option value="critical">Críticos</option>
                                    <option value="leak">Vazamentos</option>
                                    <option value="quality">Qualidade</option>
                                </select>
                            </div>
                            <div className="alerts-filter">
                                <FaClock className="filter-icon" />
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="newest">Mais recentes</option>
                                    <option value="oldest">Mais antigos</option>
                                    <option value="severity">Severidade</option>
                                </select>
                            </div>
                            <div className="alerts-view-toggle">
                                <button 
                                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                    title="Visualização em lista"
                                >
                                    ☰
                                </button>
                                <button 
                                    className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
                                    onClick={() => setViewMode('compact')}
                                    title="Visualização compacta"
                                >
                                    ≡
                                </button>
                            </div>
                        </div>
                        <div className="alerts-search">
                            <input
                                type="text"
                                placeholder="Buscar alertas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button 
                                    className="search-clear"
                                    onClick={clearSearch}
                                    aria-label="Limpar busca"
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Contador de resultados */}
                    <div className="alerts-result-count">
                        <span>
                            {filteredAlerts.length} alerta{filteredAlerts.length !== 1 ? 's' : ''} encontrado
                            {filter !== 'all' ? ` (filtrado por: ${getFilterLabel(filter)})` : ''}
                            {searchTerm ? ` buscando por: "${searchTerm}"` : ''}
                        </span>
                        {filteredAlerts.length > 0 && (
                            <button 
                                className="clear-filters"
                                onClick={() => {
                                    setFilter('all');
                                    setSearchTerm('');
                                    setSortBy('newest');
                                }}
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>

                    {/* Lista de Alertas */}
                    <div className="alerts-list-container">
                        {filteredAlerts.length === 0 ? (
                            <div className="alerts-empty">
                                {alerts?.length > 0 ? (
                                    <>
                                        <FaFilter size={48} color="#999" />
                                        <h3>Nenhum alerta encontrado com os filtros atuais</h3>
                                        <p>Tente ajustar os filtros de busca ou visualização</p>
                                        <button 
                                            className="clear-all-filters"
                                            onClick={() => {
                                                setFilter('all');
                                                setSearchTerm('');
                                                setSortBy('newest');
                                            }}
                                        >
                                            Limpar todos os filtros
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle size={48} color="#4CAF50" />
                                        <h3>Nenhum alerta registrado</h3>
                                        <p>Seu sistema está funcionando normalmente</p>
                                        <p className="empty-subtext">
                                            <FaWater /> O Hydrovel monitora seu sistema 24h
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className={`alerts-list ${viewMode}`}>
                                {filteredAlerts.map(alert => (
                                    <AlertItem 
                                        key={alert._id} 
                                        alert={alert}
                                        expanded={selectedAlert?._id === alert._id}
                                        onToggleExpand={() => {
                                            setSelectedAlert(
                                                selectedAlert?._id === alert._id ? null : alert
                                            );
                                        }}
                                        onAction={handleAlertAction}
                                        compact={viewMode === 'compact'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AlertsPage;