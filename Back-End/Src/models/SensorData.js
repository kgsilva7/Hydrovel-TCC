const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true,
        index: true
    },
    sensor_type: {
        type: String,
        enum: ['flow', 'pressure', 'ph', 'turbidity', 'temperature'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        location: String,
        unit: String,
        min_threshold: Number,
        max_threshold: Number
    }
}, {
    timestamps: false // ← removido; era incompatível com capped
});

// Índice para consultas rápidas (TTL opcional comentado)
sensorDataSchema.index({ user_id: 1, sensor_type: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

module.exports = SensorData;
