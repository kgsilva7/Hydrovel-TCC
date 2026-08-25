const { pool } = require('../config/database');
const SensorData = require('../models/SensorData');
const AnomalyDetectionService = require('../services/anomalyDetection');

class SensorController {
    async receiveSensorData(req, res) {
        try {
            const { user_id, sensor_type, value, metadata } = req.body;

            // Validar dados
            if (!user_id || !sensor_type || value === undefined) {
                return res.status(400).json({ error: 'Dados inválidos' });
            }

            // Salvar no MySQL (dados estruturados)
            const [result] = await pool.execute(
                'INSERT INTO readings (sensor_id, value) VALUES (?, ?)',
                [sensor_type, value]
            );

            // Salvar no MongoDB (dados históricos)
            const sensorData = new SensorData({
                user_id,
                sensor_type,
                value,
                metadata
            });
            await sensorData.save();

            // Verificar anomalias
            const alerts = await AnomalyDetectionService.checkAnomalies(
                user_id,
                sensor_type,
                value,
                new Date()
            );

            res.status(201).json({
                message: 'Dados recebidos com sucesso',
                id: result.insertId,
                alerts: alerts.length
            });
        } catch (error) {
            console.error('Erro ao receber dados do sensor:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getSensorData(req, res) {
        try {
            const { userId } = req.params;
            const { sensorType, startDate, endDate, limit = 100 } = req.query;

            const query = { user_id: parseInt(userId) };
            if (sensorType) query.sensor_type = sensorType;
            if (startDate) query.timestamp = { $gte: new Date(startDate) };
            if (endDate) query.timestamp = { ...query.timestamp, $lte: new Date(endDate) };

            const data = await SensorData.find(query)
                .sort({ timestamp: -1 })
                .limit(parseInt(limit));

            res.json(data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getDashboard(req, res) {
        try {
            const { userId } = req.params;
            const dashboardData = await AnomalyDetectionService.getDashboardData(parseInt(userId));
            res.json(dashboardData);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getLeakPrediction(req, res) {
        try {
            const { userId } = req.params;
            const prediction = await AnomalyDetectionService.predictLeakProbability(parseInt(userId));
            res.json(prediction);
        } catch (error) {
            console.error('Erro na predição de vazamento:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new SensorController();