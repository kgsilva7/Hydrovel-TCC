import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';
import { FaWater, FaHome, FaBell, FaCog, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import './styles.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { unreadCount } = useAlerts();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/dashboard" className="navbar-brand" onClick={closeMobileMenu}>
                    <FaWater className="brand-icon" />
                    <span className="brand-text">Hydrovel</span>
                </Link>

                {/* Menu Desktop */}
                <div className="navbar-menu desktop-menu">
                    <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                        <FaHome className="nav-icon" />
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/alertas" className={`nav-link ${isActive('/alertas')}`}>
                        <FaBell className="nav-icon" />
                        <span>Alertas</span>
                        {unreadCount > 0 && (
                            <span className="nav-badge">{unreadCount}</span>
                        )}
                    </Link>
                    <Link to="/configuracoes" className={`nav-link ${isActive('/configuracoes')}`}>
                        <FaCog className="nav-icon" />
                        <span>Configurações</span>
                    </Link>
                </div>

                {/* User Info e Logout */}
                <div className="navbar-user desktop-menu">
                    <div className="user-info">
                        <span className="user-name">{user?.name || 'Usuário'}</span>
                        <span className="user-email">{user?.email}</span>
                    </div>
                    <button onClick={handleLogout} className="logout-btn" title="Sair">
                        <FaSignOutAlt />
                    </button>
                </div>

                {/* Menu Mobile Toggle */}
                <button 
                    className="mobile-toggle"
                    onClick={toggleMobileMenu}
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                </button>
            </div>

            {/* Menu Mobile */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-content">
                    <Link to="/dashboard" className="mobile-nav-link" onClick={closeMobileMenu}>
                        <FaHome /> Dashboard
                    </Link>
                    <Link to="/alertas" className="mobile-nav-link" onClick={closeMobileMenu}>
                        <FaBell /> Alertas
                        {unreadCount > 0 && (
                            <span className="nav-badge">{unreadCount}</span>
                        )}
                    </Link>
                    <Link to="/configuracoes" className="mobile-nav-link" onClick={closeMobileMenu}>
                        <FaCog /> Configurações
                    </Link>
                    <hr className="mobile-divider" />
                    <div className="mobile-user-info">
                        <span className="mobile-user-name">{user?.name || 'Usuário'}</span>
                        <span className="mobile-user-email">{user?.email}</span>
                    </div>
                    <button onClick={handleLogout} className="mobile-logout-btn">
                        <FaSignOutAlt /> Sair
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;