import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const ConsumptionChart = ({ data }) => {
    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Consumo: ${context.parsed.y} L`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return value + ' L';
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    // Dados de exemplo (serão substituídos por dados reais)
    const chartData = {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
        datasets: [
            {
                label: 'Consumo de Água',
                data: [12, 8, 25, 35, 20, 15, 10],
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    return (
        <div className="consumption-chart">
            <Line data={chartData} options={options} />
            <div className="chart-stats">
                <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">125 L</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Média:</span>
                    <span className="stat-value">17.8 L/h</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Pico:</span>
                    <span className="stat-value">35 L</span>
                </div>
            </div>
        </div>
    );
};

export default ConsumptionChart;