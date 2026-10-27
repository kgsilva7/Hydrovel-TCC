const { pool } = require('../config/database');
const SensorData = require('../models/SensorData');
const AnomalyDetectionService = require('../services/anomalyDetection');

const VALID_TYPES = ['flow', 'pressure', 'ph', 'turbidity', 'temperature'];

class SensorController {
    async receiveSensorData(req, res) {
        try {
            const { user_id, sensor_type, value, metadata } = req.body;

            if (!user_id || !sensor_type || value === undefined || value === null) {
                return res.status(400).json({ error: 'user_id, sensor_type e value são obrigatórios' });
            }
            if (!VALID_TYPES.includes(sensor_type)) {
                return res.status(400).json({ error: `sensor_type inválido. Use: ${VALID_TYPES.join(', ')}` });
            }
            const numericValue = Number(value);
            if (Number.isNaN(numericValue)) {
                return res.status(400).json({ error: 'value deve ser numérico' });
            }

            // Verifica se o usuário existe (evita FK violation)
            const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [user_id]);
            if (users.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // Busca sensor cadastrado (opcional)
            const [sensors] = await pool.execute(
                'SELECT id FROM sensors WHERE user_id = ? AND sensor_type = ? AND status = "active" LIMIT 1',
                [user_id, sensor_type]
            );
            const sensorId = sensors.length > 0 ? sensors[0].id : null;

            // Salva no MySQL
            const [result] = await pool.execute(
                'INSERT INTO readings (sensor_id, user_id, sensor_type, value) VALUES (?, ?, ?, ?)',
                [sensorId, user_id, sensor_type, numericValue]
            );

            // Salva no MongoDB (histórico)
            await SensorData.create({
                user_id,
                sensor_type,
                value: numericValue,
                metadata: metadata || {}
            });

            // Verifica anomalias
            const alerts = await AnomalyDetectionService.checkAnomalies(
                user_id,
                sensor_type,
                numericValue,
                new Date()
            );

            res.status(201).json({
                message: 'Dados recebidos com sucesso',
                id: result.insertId,
                alerts_created: alerts.length
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

            const query = { user_id: parseInt(userId, 10) };
            if (sensorType && VALID_TYPES.includes(sensorType)) query.sensor_type = sensorType;
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }

            const data = await SensorData.find(query)
                .sort({ timestamp: -1 })
                .limit(Math.min(parseInt(limit, 10) || 100, 1000));

            res.json(data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getDashboard(req, res) {
        try {
            const { userId } = req.params;
            const dashboardData = await AnomalyDetectionService.getDashboardData(parseInt(userId, 10));
            res.json(dashboardData);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getLeakPrediction(req, res) {
        try {
            const { userId } = req.params;
            const prediction = await AnomalyDetectionService.predictLeakProbability(parseInt(userId, 10));
            res.json(prediction);
        } catch (error) {
            console.error('Erro na predição de vazamento:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new SensorController();
