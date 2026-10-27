const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { publishMessage, MQTT_TOPICS } = require('../config/mqtt');

const DEFAULT_THRESHOLDS = {
    flow: { min: 0, max: 100 },
    pressure: { min: 0, max: 60 },
    ph: { min: 6.5, max: 8.5 },
    turbidity: { min: 0, max: 5 },
    temperature: { min: 10, max: 35 }
};

const ALERT_DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 min

class AnomalyDetectionService {
    constructor() {
        this.alertTimeWindow = 5 * 60 * 1000; // 5 min
    }

    async getThresholdsForUser(userId) {
        try {
            const user = await User.findOne({ mysql_id: userId });
            const userThresholds = user?.settings?.thresholds;
            return { ...DEFAULT_THRESHOLDS, ...(userThresholds || {}) };
        } catch (err) {
            console.error('Erro ao buscar thresholds do usuário:', err.message);
            return DEFAULT_THRESHOLDS;
        }
    }

    async checkAnomalies(userId, sensorType, value, timestamp) {
        const alerts = [];
        const thresholds = await this.getThresholdsForUser(userId);

        // Thresholds (usuário configurável)
        const thresholdCheck = this.checkThresholds(sensorType, value, thresholds);
        if (thresholdCheck.isAnomaly && !(await this.recentAlertExists(userId, sensorType))) {
            alerts.push(await this.createAlert(
                userId,
                sensorType,
                thresholdCheck.severity,
                thresholdCheck.message,
                { sensor_type: sensorType, value, threshold: thresholdCheck.thresholdValue }
            ));
        }

        // Padrão de vazamento (fluxo)
        if (sensorType === 'flow') {
            const leakCheck = await this.checkLeakPattern(userId, value, timestamp);
            if (leakCheck.isLeak && !(await this.recentAlertExists(userId, 'leak'))) {
                alerts.push(await this.createAlert(
                    userId,
                    'leak',
                    'high',
                    leakCheck.message,
                    { sensor_type: sensorType, value, threshold: leakCheck.threshold }
                ));
            }
        }

        return alerts;
    }

    /**
     * Deduplicação: não cria alerta se já existe um alerta do mesmo tipo
     * no mesmo período (evita spam a cada leitura).
     */
    async recentAlertExists(userId, type) {
        const cutoff = new Date(Date.now() - ALERT_DEDUP_WINDOW_MS);
        const existing = await Alert.findOne({
            user_id: userId,
            type,
            resolved_at: null,
            created_at: { $gte: cutoff }
        });
        return !!existing;
    }

    checkThresholds(sensorType, value, thresholds) {
        const t = thresholds[sensorType];
        if (!t) return { isAnomaly: false };

        if (value < t.min) {
            const severity = value < t.min * 0.5 ? 'critical' : 'medium';
            return {
                isAnomaly: true,
                severity,
                message: `Valor de ${sensorType} abaixo do mínimo: ${value} (mínimo: ${t.min})`,
                thresholdValue: t.min
            };
        }
        if (value > t.max) {
            const severity = value > t.max * 1.5 ? 'critical' : 'medium';
            return {
                isAnomaly: true,
                severity,
                message: `Valor de ${sensorType} acima do máximo: ${value} (máximo: ${t.max})`,
                thresholdValue: t.max
            };
        }
        return { isAnomaly: false };
    }

    async checkLeakPattern(userId, flowValue, timestamp) {
        const fiveMinutesAgo = new Date(timestamp - this.alertTimeWindow);
        const recentData = await SensorData.find({
            user_id: userId,
            sensor_type: 'flow',
            timestamp: { $gte: fiveMinutesAgo }
        }).sort({ timestamp: -1 });

        if (recentData.length < 3) return { isLeak: false };

        const averageFlow = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;

        // Fluxo contínuo > 5 L/min por 5 min, em qualquer horário
        // (mais sensível à noite, mas não ignora o dia)
        const hour = new Date(timestamp).getHours();
        const isNight = hour >= 22 || hour < 6;
        const threshold = isNight ? 5 : 15; // Limite mais alto de dia

        if (averageFlow > threshold) {
            return {
                isLeak: true,
                message: `Possível vazamento detectado! Fluxo contínuo de ${averageFlow.toFixed(1)} L/min ${isNight ? 'durante período noturno' : 'durante o dia'}`,
                threshold
            };
        }
        return { isLeak: false };
    }

    async createAlert(userId, type, severity, message, sensorData) {
        const alert = await Alert.create({
            user_id: userId,
            type,
            severity,
            message,
            sensor_data: sensorData
        });

        publishMessage(MQTT_TOPICS.ALERT, {
            user_id: userId,
            alert_id: alert._id,
            type,
            severity,
            message,
            timestamp: alert.created_at
        });

        if (global.io) {
            global.io.to(`user_${userId}`).emit('new_alert', alert);
        }

        return alert;
    }

    async getDashboardData(userId) {
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);

        const lastReadings = await SensorData.aggregate([
            { $match: { user_id: userId } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: '$sensor_type',
                    value: { $first: '$value' },
                    timestamp: { $first: '$timestamp' }
                }
            }
        ]);

        const averages24h = await SensorData.aggregate([
            { $match: { user_id: userId, timestamp: { $gte: last24h } } },
            {
                $group: {
                    _id: '$sensor_type',
                    average: { $avg: '$value' },
                    max: { $max: '$value' },
                    min: { $min: '$value' }
                }
            }
        ]);

        const unreadAlerts = await Alert.find({
            user_id: userId,
            read: false,
            resolved_at: null
        }).sort({ created_at: -1 });

        const flowData = await SensorData.find({
            user_id: userId,
            sensor_type: 'flow',
            timestamp: { $gte: last24h }
        }).sort({ timestamp: 1 });

        const consumption = this.calculateConsumption(flowData);

        return { lastReadings, averages: averages24h, alerts: unreadAlerts, consumption, timestamp: now };
    }

    calculateConsumption(flowData) {
        if (!flowData || flowData.length < 2) return { total: 0, average: 0, peak: 0 };

        let total = 0;
        let peak = 0;

        for (let i = 1; i < flowData.length; i++) {
            const diffMin = (flowData[i].timestamp - flowData[i - 1].timestamp) / (1000 * 60);
            // Ignora gaps > 10 min (leituras interrompidas) para não inflar
            if (diffMin > 10) continue;
            const volume = flowData[i].value * diffMin;
            total += volume;
            if (flowData[i].value > peak) peak = flowData[i].value;
        }

        return {
            total: Math.round(total),
            average: Math.round(total / flowData.length),
            peak: Math.round(peak)
        };
    }

    async predictLeakProbability(userId, days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const flowData = await SensorData.find({
            user_id: userId,
            sensor_type: 'flow',
            timestamp: { $gte: startDate }
        }).sort({ timestamp: 1 });

        if (flowData.length < 30) {
            return { probability: 0, message: 'Dados insuficientes para análise' };
        }

        const windowSize = Math.min(60, Math.floor(flowData.length / 4));
        const anomalies = [];

        for (let i = windowSize; i < flowData.length; i++) {
            const window = flowData.slice(i - windowSize, i);
            const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
            if (avg > 0 && flowData[i].value > avg * 1.5) {
                anomalies.push(flowData[i].value);
            }
        }

        const anomalyRate = anomalies.length / flowData.length;
        let probability = Math.min(anomalyRate * 100, 90);

        const hourlyPatterns = this.calculateHourlyPatterns(flowData);
        const suspiciousHours = this.findSuspiciousHours(flowData, hourlyPatterns);
        if (suspiciousHours.length > 0) probability = Math.min(probability + 20, 95);

        return {
            probability: Math.round(probability),
            anomalies: anomalies.length,
            suspiciousHours,
            message:
                probability > 70
                    ? 'Alta probabilidade de vazamento'
                    : probability > 40
                        ? 'Possibilidade moderada de vazamento'
                        : 'Baixa probabilidade de vazamento'
        };
    }

    calculateHourlyPatterns(data) {
        const patterns = {};
        data.forEach((item) => {
            const hour = new Date(item.timestamp).getHours();
            if (!patterns[hour]) patterns[hour] = [];
            patterns[hour].push(item.value);
        });
        Object.keys(patterns).forEach((hour) => {
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
        const threshold = 0.5;
        data.forEach((item) => {
            const hour = new Date(item.timestamp).getHours();
            const pattern = patterns[hour];
            if (pattern && pattern.average > 0 && item.value > pattern.average * (1 + threshold)) {
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
