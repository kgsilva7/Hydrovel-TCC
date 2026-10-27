const mongoose = require('mongoose');

const DEFAULT_THRESHOLDS = {
    flow: { min: 0, max: 100 },
    pressure: { min: 0, max: 60 },
    ph: { min: 6.5, max: 8.5 },
    turbidity: { min: 0, max: 5 },
    temperature: { min: 10, max: 35 }
};

const userSettingsSchema = new mongoose.Schema({
    alert_notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true }
    },
    thresholds: {
        type: mongoose.Schema.Types.Mixed,
        default: () => JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS))
    },
    system: {
        auto_resolve: { type: Boolean, default: false },
        daily_report: { type: Boolean, default: true },
        maintenance_mode: { type: Boolean, default: false }
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    mysql_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    settings: {
        type: userSettingsSchema,
        default: () => ({})
    },
    sensors: [{
        id: Number,
        type: String,
        location: String,
        status: String
    }],
    last_login: Date,
    active: { type: Boolean, default: true }
}, {
    timestamps: true
});

userSchema.statics.DEFAULT_THRESHOLDS = DEFAULT_THRESHOLDS;

const User = mongoose.model('User', userSchema);

module.exports = User;
