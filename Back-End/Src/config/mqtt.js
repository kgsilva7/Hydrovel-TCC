const mqtt = require('mqtt');
const dotenv = require('dotenv');

dotenv.config();

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPICS = {
    SENSOR_DATA: 'hydrovel/sensor/data',
    ALERT: 'hydrovel/alert',
    COMMAND: 'hydrovel/command'
};

let client = null;

const connectMQTT = () => {
    client = mqtt.connect(MQTT_BROKER);

    client.on('connect', () => {
        console.log('✅ Conectado ao broker MQTT');
        client.subscribe(MQTT_TOPICS.SENSOR_DATA, (err) => {
            if (err) {
                console.error('❌ Erro ao subscrever tópico:', err);
            }
        });
    });

    client.on('error', (error) => {
        console.error('❌ Erro MQTT:', error);
    });

    return client;
};

const publishMessage = (topic, message) => {
    if (client) {
        client.publish(topic, JSON.stringify(message));
    }
};

module.exports = { connectMQTT, publishMessage, MQTT_TOPICS };