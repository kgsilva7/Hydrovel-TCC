const express = require('express');
const router = express.Router();
const SensorController = require('../controllers/sensorController');
const auth = require('../middleware/auth');

// Rotas públicas (para ESP32)
router.post('/data', SensorController.receiveSensorData);

// Rotas autenticadas
router.get('/:userId/data', auth, SensorController.getSensorData);
router.get('/:userId/dashboard', auth, SensorController.getDashboard);
router.get('/:userId/prediction', auth, SensorController.getLeakPrediction);

module.exports = router;