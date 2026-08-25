const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const { publishMessage, MQTT_TOPICS } = require('../config/mqtt');

class AnomalyDetectionService {
    constructor() {
        this.thresholds = {
            flow: { min: 0, max: 100 },
            pressure: { min: 0, max: 60 },
            ph: { min: 6.5, max: 8.5 },
            turbidity: { min: 0, max: 5 },
            temperature: { min: 10, max: 35 }
        };
        this.alertTimeWindow = 5 * 60 * 1000; // 5 minutos
    }

    async checkAnomalies(userId, sensorType, value, timestamp) {
        const alerts = [];

        // Verificar thresholds
        const thresholdCheck = this.checkThresholds(sensorType, value);
        if (thresholdCheck.isAnomaly) {
            const alert = await this.createAlert(
                userId,
                sensorType,
                thresholdCheck.severity,
                thresholdCheck.message,
                { sensor_type: sensorType, value, threshold: thresholdCheck.threshold }
            );
            alerts.push(alert);
        }

        // Verificar padrões de vazamento
        if (sensorType === 'flow') {
            const leakCheck = await this.checkLeakPattern(userId, value, timestamp);
            if (leakCheck.isLeak) {
                const alert = await this.createAlert(
                    userId,
                    'leak',
                    'high',
                    leakCheck.message,
                    { sensor_type: sensorType, value, threshold: leakCheck.threshold }
                );
                alerts.push(alert);
            }
        }

        // Verificar mudanças bruscas
        const suddenChangeCheck = await this.checkSuddenChanges(userId, sensorType, value);
        if (suddenChangeCheck.isAnomaly) {
            const alert = await this.createAlert(
                userId,
                sensorType,
                'medium',
                suddenChangeCheck.message,
                { sensor_type: sensorType, value, threshold: suddenChangeCheck.threshold }
            );
            alerts.push(alert);
        }

        return alerts;
    }

    checkThresholds(sensorType, value) {
        const threshold = this.thresholds[sensorType];
        if (!threshold) return { isAnomaly: false };

        let severity = 'low';
        let message = '';
        let isAnomaly = false;

        if (value < threshold.min) {
            isAnomaly = true;
            severity = value < threshold.min * 0.5 ? 'critical' : 'medium';
            message = `Valor de ${sensorType} abaixo do mínimo: ${value} (mínimo: ${threshold.min})`;
        } else if (value > threshold.max) {
            isAnomaly = true;
            severity = value > threshold.max * 1.5 ? 'critical' : 'medium';
            message = `Valor de ${sensorType} acima do máximo: ${value} (máximo: ${threshold.max})`;
        }

        return { isAnomaly, severity, message, threshold };
    }

    async checkLeakPattern(userId, flowValue, timestamp) {
        const fiveMinutesAgo = new Date(timestamp - this.alertTimeWindow);
        
        // Buscar dados de fluxo dos últimos 5 minutos
        const recentData = await SensorData.find({
            user_id: userId,
            sensor_type: 'flow',
            timestamp: { $gte: fiveMinutesAgo }
        }).sort({ timestamp: -1 });

        if (recentData.length < 3) return { isLeak: false };

        // Verificar se há fluxo contínuo
        const averageFlow = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
        
        if (averageFlow > 5) { // Mais de 5 L/min
            // Verificar período noturno (22h - 6h)
            const hour = new Date(timestamp).getHours();
            if (hour >= 22 || hour < 6) {
                return {
                    isLeak: true,
                    message: `Possível vazamento detectado! Fluxo contínuo de ${averageFlow.toFixed(1)} L/min durante período noturno`,
                    threshold: 5
                };
            }
        }

        return { isLeak: false };
    }

    async checkSuddenChanges(userId, sensorType, value) {
        const recentData = await SensorData.findOne({
            user_id: userId,
            sensor_type: sensorType
        }).sort({ timestamp: -1 });

        if (!recentData) return { isAnomaly: false };

        const percentChange = Math.abs((value - recentData.value) / recentData.value * 100);
        
        if (percentChange > 50) { // Mais de 50% de mudança
            return {
                isAnomaly: true,
                message: `Mudança brusca detectada em ${sensorType}: ${percentChange.toFixed(1)}% de variação`,
                threshold: 50
            };
        }

        return { isAnomaly: false };
    }

    async createAlert(userId, type, severity, message, sensorData) {
        const alert = new Alert({
            user_id: userId,
            type,
            severity,
            message,
            sensor_data: sensorData
        });

        await alert.save();

        // Publicar alerta via MQTT
        publishMessage(MQTT_TOPICS.ALERT, {
            user_id: userId,
            alert_id: alert._id,
            type,
            severity,
            message,
            timestamp: alert.created_at
        });

        // Emitir via Socket.IO (será configurado na app principal)
        if (global.io) {
            global.io.to(`user_${userId}`).emit('new_alert', alert);
        }

        return alert;
    }

    async getDashboardData(userId) {
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);

        // Últimas leituras
        const lastReadings = await SensorData.aggregate([
            { $match: { user_id: userId } },
            { $sort: { timestamp: -1 } },
            { $group: {
                _id: '$sensor_type',
                value: { $first: '$value' },
                timestamp: { $first: '$timestamp' }
            }}
        ]);

        // Médias das últimas 24h
        const averages24h = await SensorData.aggregate([
            { $match: { 
                user_id: userId,
                timestamp: { $gte: last24h }
            }},
            { $group: {
                _id: '$sensor_type',
                average: { $avg: '$value' },
                max: { $max: '$value' },
                min: { $min: '$value' }
            }}
        ]);

        // Alertas não lidos
        const unreadAlerts = await Alert.find({
            user_id: userId,
            read: false,
            resolved_at: null
        }).sort({ created_at: -1 });

        // Estatísticas de consumo (últimas 24h)
        const flowData = await SensorData.find({
            user_id: userId,
            sensor_type: 'flow',
            timestamp: { $gte: last24h }
        }).sort({ timestamp: 1 });

        const consumption = this.calculateConsumption(flowData);

        return {
            lastReadings,
            averages: averages24h,
            alerts: unreadAlerts,
            consumption,
            timestamp: now
        };
    }

    calculateConsumption(flowData) {
        if (flowData.length < 2) return { total: 0, average: 0, peak: 0 };

        let total = 0;
        let peak = 0;

        for (let i = 1; i < flowData.length; i++) {
            const timeDiff = (flowData[i].timestamp - flowData[i-1].timestamp) / (1000 * 60); // minutos
            const flow = flowData[i].value;
            const volume = flow * timeDiff; // Litros
            total += volume;
            if (flow > peak) peak = flow;
        }

        return {
            total: Math.round(total),
            average: Math.round(total / flowData.length),
            peak: Math.round(peak)
        };
    }

    // Análise preditiva para detecção de vazamentos
    async predictLeakProbability(userId, days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const flowData = await SensorData.find({
            user_id: userId,
            sensor_type: 'flow',
            timestamp: { $gte: startDate }
        }).sort({ timestamp: 1 });

        if (flowData.length < 100) return { probability: 0, message: 'Dados insuficientes para análise' };

        // Calcular média móvel
        const windowSize = 60; // 60 minutos
        const movingAverages = [];
        const anomalies = [];

        for (let i = windowSize; i < flowData.length; i++) {
            const window = flowData.slice(i - windowSize, i);
            const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
            movingAverages.push(avg);

            const current = flowData[i].value;
            if (current > avg * 1.5) {
                anomalies.push(current);
            }
        }

        // Calcular probabilidade baseada em anomalias
        const anomalyRate = anomalies.length / flowData.length;
        let probability = Math.min(anomalyRate * 100, 90);

        // Verificar padrões sazonais
        const hourlyPatterns = this.calculateHourlyPatterns(flowData);
        const suspiciousHours = this.findSuspiciousHours(flowData, hourlyPatterns);
        
        if (suspiciousHours.length > 0) {
            probability = Math.min(probability + 20, 95);
        }

        return {
            probability: Math.round(probability),
            anomalies: anomalies.length,
            suspiciousHours,
            message: probability > 70 ? 'Alta probabilidade de vazamento' : 
                    probability > 40 ? 'Possibilidade moderada de vazamento' : 
                    'Baixa probabilidade de vazamento'
        };
    }

    calculateHourlyPatterns(data) {
        const patterns = {};
        
        data.forEach(item => {
            const hour = new Date(item.timestamp).getHours();
            if (!patterns[hour]) patterns[hour] = [];
            patterns[hour].push(item.value);
        });

        Object.keys(patterns).forEach(hour => {
            const values = patterns[hour];
            patterns[hour] = {
                average: values.reduce((a, b) => a + b, 0) / values.length,
                count: values.length
            };
        });

        return patterns;
    }

    findSuspiciousHours(data, patterns) {
        const suspicious = [];
        const threshold = 0.5; // 50% acima da média

        data.forEach(item => {
            const hour = new Date(item.timestamp).getHours();
            const pattern = patterns[hour];
            if (pattern && item.value > pattern.average * (1 + threshold)) {
                suspicious.push({
                    hour,
                    value: item.value,
                    expected: pattern.average,
                    timestamp: item.timestamp
                });
            }
        });

        return suspicious;
    }
}

module.exports = new AnomalyDetectionService();