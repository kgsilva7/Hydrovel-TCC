const express = require('express');
const router = express.Router();
const AlertController = require('../controllers/alertController');
const auth = require('../middleware/auth');

router.get('/:userId', auth, AlertController.getAlerts);
router.get('/:userId/unread', auth, AlertController.getUnreadAlerts);
router.get('/:userId/stats', auth, AlertController.getAlertStats);
router.put('/:alertId/read', auth, AlertController.markAsRead);
router.put('/:alertId/resolve', auth, AlertController.resolveAlert);

module.exports = router;