const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['leak', 'quality', 'pressure', 'flow', 'temperature'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    sensor_data: {
        sensor_type: String,
        value: Number,
        threshold: Number
    },
    read: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    resolved_at: {
        type: Date
    },
    resolved_by: {
        type: Number // user_id
    }
}, {
    timestamps: true
});

alertSchema.index({ user_id: 1, read: 1, created_at: -1 });
alertSchema.index({ user_id: 1, resolved_at: -1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;