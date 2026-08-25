const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true
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
    timestamps: true,
    capped: { size: 1024 * 1024 * 100, max: 10000 }
});

// Índice para consultas rápidas
sensorDataSchema.index({ user_id: 1, sensor_type: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

module.exports = SensorData;