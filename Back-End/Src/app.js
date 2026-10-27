const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const { initDatabase, testConnection } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');
const { connectMQTT, onMessage, disconnectMQTT, MQTT_TOPICS } = require('./config/mqtt');
const AnomalyDetectionService = require('./services/anomalyDetection');
const SensorData = require('./models/SensorData');

const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// ======== Middlewares globais ========
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit: protege rotas públicas
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// ======== Socket.IO global ========
global.io = io;

io.on('connection', (socket) => {
    console.log('🔌 Novo cliente conectado:', socket.id);

    // Aceita tanto 'authenticate' com string quanto com objeto { userId }
    const joinRoom = (payload) => {
        const userId = typeof payload === 'object' ? payload?.userId : payload;
        if (!userId) return;
        socket.join(`user_${userId}`);
        console.log(`👤 Usuário ${userId} autenticado no socket`);
    };

    socket.on('authenticate', joinRoom);
    socket.on('join_room', ({ room }) => room && socket.join(room));
    socket.on('leave_room', ({ room }) => room && socket.leave(room));

    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
    });
});

// ======== Rotas ========
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 para rotas desconhecidas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Handler global de erros (precisa dos 4 parâmetros)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('💥 Erro não tratado:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor'
    });
});

// ======== Integração MQTT ========
const setupMQTT = () => {
    connectMQTT();

    onMessage(async (topic, rawMessage) => {
        if (topic !== MQTT_TOPICS.SENSOR_DATA) return;
        try {
            const data = JSON.parse(rawMessage.toString());
            const { user_id, sensor_type, value, metadata } = data;

            if (!user_id || !sensor_type || value === undefined) {
                console.warn('⚠️ Mensagem MQTT inválida:', data);
                return;
            }

            await SensorData.create({
                user_id,
                sensor_type,
                value: Number(value),
                metadata: metadata || {}
            });

            await AnomalyDetectionService.checkAnomalies(
                user_id,
                sensor_type,
                Number(value),
                new Date()
            );

            if (global.io) {
                global.io.to(`user_${user_id}`).emit('sensor_update', {
                    sensor_type,
                    value: Number(value),
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Erro ao processar mensagem MQTT:', error.message);
        }
    });
};

// ======== Inicialização ========
const startServer = async () => {
    try {
        await testConnection();
        await initDatabase();
        await connectMongoDB();
        setupMQTT();

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

// Encerramento gracioso
const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} recebido, encerrando...`);
    disconnectMQTT();
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

module.exports = { app, server, io };
