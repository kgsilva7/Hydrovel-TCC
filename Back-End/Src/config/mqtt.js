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
let messageHandlers = [];

const connectMQTT = () => {
    if (client) return client;

    client = mqtt.connect(MQTT_BROKER, {
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        clean: true
    });

    client.on('connect', () => {
        console.log('✅ Conectado ao broker MQTT');
        client.subscribe(MQTT_TOPICS.SENSOR_DATA, { qos: 1 }, (err) => {
            if (err) console.error('❌ Erro ao subscrever tópico:', err);
            else console.log(`📡 Subscrito em ${MQTT_TOPICS.SENSOR_DATA}`);
        });
    });

    client.on('error', (error) => {
        console.error('❌ Erro MQTT:', error.message);
    });

    client.on('offline', () => {
        console.warn('⚠️ MQTT offline');
    });

    client.on('reconnect', () => {
        console.log('🔄 Reconectando ao MQTT...');
    });

    // Listener central que distribui para handlers registrados
    client.on('message', (topic, message) => {
        messageHandlers.forEach((handler) => {
            try {
                handler(topic, message);
            } catch (err) {
                console.error('Erro em handler MQTT:', err);
            }
        });
    });

    return client;
};

const onMessage = (handler) => {
    messageHandlers.push(handler);
    return () => {
        messageHandlers = messageHandlers.filter((h) => h !== handler);
    };
};

const publishMessage = (topic, message) => {
    if (!client || !client.connected) {
        console.warn(`⚠️ MQTT não conectado. Não publicando em ${topic}`);
        return false;
    }
    client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
        if (err) console.error(`❌ Falha ao publicar em ${topic}:`, err.message);
    });
    return true;
};

const disconnectMQTT = () => {
    if (client) {
        client.end(true);
        client = null;
    }
};

module.exports = {
    connectMQTT,
    publishMessage,
    onMessage,
    disconnectMQTT,
    MQTT_TOPICS
};
