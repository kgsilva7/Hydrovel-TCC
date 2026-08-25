import React from 'react';
import { FaHeart, FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import './styles.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h4 className="footer-title">Hydrovel</h4>
                    <p className="footer-description">
                        Sistema de Monitoramento Inteligente de Água para residências.
                        Detecte vazamentos e anomalias em tempo real.
                    </p>
                </div>

                <div className="footer-section">
                    <h4 className="footer-title">Links Rápidos</h4>
                    <ul className="footer-links">
                        <li><a href="/dashboard">Dashboard</a></li>
                        <li><a href="/alertas">Alertas</a></li>
                        <li><a href="/configuracoes">Configurações</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4 className="footer-title">Contato</h4>
                    <ul className="footer-links">
                        <li>
                            <a href="mailto:contato@hydrovel.com">
                                <FaEnvelope /> contato@hydrovel.com
                            </a>
                        </li>
                        <li>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                                <FaGithub /> GitHub
                            </a>
                        </li>
                        <li>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                                <FaLinkedin /> LinkedIn
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <p>
                    Feito com <FaHeart className="footer-heart" /> por Equipe Hydrovel
                </p>
                <p>
                    &copy; {currentYear} Hydrovel. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
};

export default Footer;