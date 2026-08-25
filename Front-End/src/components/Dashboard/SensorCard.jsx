import React from 'react';
import './styles.css';

const SensorCard = ({ title, value, unit, icon: Icon, color, status }) => {
    return (
        <div className="sensor-card">
            <div className="sensor-icon" style={{ background: color }}>
                <Icon size={24} color="white" />
            </div>
            <div className="sensor-info">
                <h3>{title}</h3>
                <div className="sensor-value">
                    <span className="value">{value}</span>
                    {unit && <span className="unit">{unit}</span>}
                </div>
                <div className="sensor-status">
                    <span className={`status-badge ${status}`}>
                        {status === 'normal' ? '✅ Normal' : '⚠️ Atenção'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default SensorCard;