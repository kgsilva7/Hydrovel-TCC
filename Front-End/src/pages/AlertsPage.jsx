import React, { useState, useEffect } from 'react';
import { useAlerts } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import AlertList from '../components/Dashboard/AlertList';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import { FaFilter, FaDownload } from 'react-icons/fa';
import './styles.css';

const AlertsPage = () => {
    const { alerts, unreadCount, fetchAlerts, loading } = useAlerts();
    const { user } = useAuth();
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            fetchAlerts();
        }
    }, [user]);

    const getFilteredAlerts = () => {
        let filtered = alerts;
        
        if (filter === 'unread') {
            filtered = filtered.filter(a => !a.read);
        } else if (filter === 'resolved') {
            filtered = filtered.filter(a => a.resolved_at);
        } else if (filter === 'unresolved') {
            filtered = filtered.filter(a => !a.resolved_at);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(a => 
                a.message.toLowerCase().includes(term) ||
                a.type.toLowerCase().includes(term)
            );
        }

        return filtered;
    };

    const filteredAlerts = getFilteredAlerts();

    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="main-content">
                <div className="alerts-page">
                    <div className="alerts-header">
                        <div>
                            <h1>Alertas</h1>
                            <p className="alerts-subtitle">
                                {unreadCount} não lidos • {alerts.length} total
                            </p>
                        </div>
                        <div className="alerts-actions">
                            <button className="alerts-action-btn">
                                <FaDownload /> Exportar
                            </button>
                        </div>
                    </div>

                    <div className="alerts-controls">
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
                            </select>
                        </div>
                        <div className="alerts-search">
                            <input
                                type="text"
                                placeholder="Buscar alertas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="alerts-list-container">
                            <AlertList alerts={filteredAlerts} limit={100} />
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AlertsPage;