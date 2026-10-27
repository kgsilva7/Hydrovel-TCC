const Alert = require('../models/Alert');

const emitAlertEvent = (userId, event, payload) => {
    if (global.io) {
        global.io.to(`user_${userId}`).emit(event, payload);
    }
};

class AlertController {
    async getAlerts(req, res) {
        try {
            const { userId } = req.params;
            const { read, resolved, limit = 50, offset = 0 } = req.query;

            const query = { user_id: parseInt(userId, 10) };
            if (read !== undefined) query.read = read === 'true';
            if (resolved === 'true') query.resolved_at = { $ne: null };
            if (resolved === 'false') query.resolved_at = null;

            const alerts = await Alert.find(query)
                .sort({ created_at: -1 })
                .skip(parseInt(offset, 10) || 0)
                .limit(Math.min(parseInt(limit, 10) || 50, 200));

            const total = await Alert.countDocuments(query);

            res.json({
                alerts,
                pagination: {
                    total,
                    offset: parseInt(offset, 10) || 0,
                    limit: parseInt(limit, 10) || 50
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
                user_id: parseInt(userId, 10),
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
            // Preferimos o ID do token (mais seguro que body)
            const userId = req.user.id;

            const alert = await Alert.findOneAndUpdate(
                { _id: alertId, user_id: userId },
                { read: true },
                { new: true }
            );

            if (!alert) {
                return res.status(404).json({ error: 'Alerta não encontrado' });
            }

            emitAlertEvent(userId, 'alert_read', { alertId: alert._id });

            res.json({ message: 'Alerta marcado como lido', alert });
        } catch (error) {
            console.error('Erro ao marcar alerta como lido:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async resolveAlert(req, res) {
        try {
            const { alertId } = req.params;
            const userId = req.user.id;

            const alert = await Alert.findOneAndUpdate(
                { _id: alertId, user_id: userId },
                {
                    resolved_at: new Date(),
                    resolved_by: userId,
                    read: true
                },
                { new: true }
            );

            if (!alert) {
                return res.status(404).json({ error: 'Alerta não encontrado' });
            }

            emitAlertEvent(userId, 'alert_resolved', { alertId: alert._id, alert });

            res.json({ message: 'Alerta resolvido', alert });
        } catch (error) {
            console.error('Erro ao resolver alerta:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getAlertStats(req, res) {
        try {
            const { userId } = req.params;

            const byType = await Alert.aggregate([
                { $match: { user_id: parseInt(userId, 10) } },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: 1 },
                        read: { $sum: { $cond: ['$read', 1, 0] } },
                        resolved: { $sum: { $cond: [{ $ne: ['$resolved_at', null] }, 1, 0] } }
                    }
                }
            ]);

            const bySeverity = await Alert.aggregate([
                { $match: { user_id: parseInt(userId, 10) } },
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ]);

            res.json({ byType, bySeverity });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new AlertController();
