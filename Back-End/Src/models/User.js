const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    alert_notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true }
    },
    thresholds: {
        flow: { min: Number, max: Number },
        pressure: { min: Number, max: Number },
        ph: { min: Number, max: Number },
        turbidity: { min: Number, max: Number },
        temperature: { min: Number, max: Number }
    }
});

const userSchema = new mongoose.Schema({
    mysql_id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
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
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;