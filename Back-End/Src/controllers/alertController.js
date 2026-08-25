const Alert = require('../models/Alert');
const NotificationService = require('../services/notificationService');
const { pool } = require('../config/database');

class AlertController {
    async getAlerts(req, res) {
        try {
            const { userId } = req.params;
            const { read, resolved, limit = 50, offset = 0 } = req.query;

            const query = { user_id: parseInt(userId) };
            if (read !== undefined) query.read = read === 'true';
            if (resolved === 'true') query.resolved_at = { $ne: null };
            if (resolved === 'false') query.resolved_at = null;

            const alerts = await Alert.find(query)
                .sort({ created_at: -1 })
                .skip(parseInt(offset))
                .limit(parseInt(limit));

            const total = await Alert.countDocuments(query);

            res.json({
                alerts,
                pagination: {
                    total,
                    offset: parseInt(offset),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Erro ao buscar alertas:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getUnreadAlerts(req, res) {
        try {
            const { userId } = req.params;

            const alerts = await Alert.find({
                user_id: parseInt(userId),
                read: false,
                resolved_at: null
            }).sort({ created_at: -1 });

            res.json(alerts);
        } catch (error) {
            console.error('Erro ao buscar alertas não lidos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async markAsRead(req, res) {
        try {
            const { alertId } = req.params;
            const { userId } = req.body;

            const alert = await Alert.findOne({
                _id: alertId,
                user_id: parseInt(userId)
            });

            if (!alert) {
                return res.status(404).json({ error: 'Alerta não encontrado' });
            }

            alert.read = true;
            await alert.save();

            res.json({ message: 'Alerta marcado como lido', alert });
        } catch (error) {
            console.error('Erro ao marcar alerta como lido:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async resolveAlert(req, res) {
        try {
            const { alertId } = req.params;
            const { userId, resolutionNote } = req.body;

            const alert = await Alert.findOne({
                _id: alertId,
                user_id: parseInt(userId)
            });

            if (!alert) {
                return res.status(404).json({ error: 'Alerta não encontrado' });
            }

            alert.resolved_at = new Date();
            alert.resolved_by = parseInt(userId);
            alert.read = true;
            await alert.save();

            res.json({ message: 'Alerta resolvido', alert });
        } catch (error) {
            console.error('Erro ao resolver alerta:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getAlertStats(req, res) {
        try {
            const { userId } = req.params;

            const stats = await Alert.aggregate([
                { $match: { user_id: parseInt(userId) } },
                { $group: {
                    _id: '$type',
                    total: { $sum: 1 },
                    read: { $sum: { $cond: ['$read', 1, 0] } },
                    resolved: { $sum: { $cond: [{ $ne: ['$resolved_at', null] }, 1, 0] } }
                }}
            ]);

            const bySeverity = await Alert.aggregate([
                { $match: { user_id: parseInt(userId) } },
                { $group: {
                    _id: '$severity',
                    count: { $sum: 1 }
                }}
            ]);

            res.json({
                byType: stats,
                bySeverity
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new AlertController(); 