const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Configurações
const { initDatabase } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');
const { connectMQTT } = require('./config/mqtt');
const NotificationService = require('./services/notificationService');

// Rotas
const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar Socket.IO global
global.io = io;

// Rotas
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);

// Rota de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    socket.on('authenticate', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Usuário ${userId} autenticado no socket`);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Função para processar dados MQTT
const setupMQTT = () => {
    const mqttClient = connectMQTT();
    
    mqttClient.on('message', async (topic, message) => {
        if (topic === 'hydrovel/sensor/data') {
            try {
                const data = JSON.parse(message.toString());
                // Processar dados recebidos via MQTT
                // Isso complementa o endpoint HTTP
                console.log('Dados recebidos via MQTT:', data);
            } catch (error) {
                console.error('Erro ao processar mensagem MQTT:', error);
            }
        }
    });
};

// Tarefas agendadas
const setupCronJobs = () => {
    // Relatório diário às 8:00
    cron.schedule('0 8 * * *', async () => {
        console.log('📊 Enviando relatórios diários...');
        // Implementar lógica de relatórios
    });

    // Verificação de sistema às 2:00
    cron.schedule('0 2 * * *', async () => {
        console.log('🔍 Verificando sistema...');
        // Implementar verificações periódicas
    });
};

// Inicialização
const startServer = async () => {
    try {
        // Inicializar bancos de dados
        await initDatabase();
        await connectMongoDB();
        
        // Configurar MQTT
        setupMQTT();
        
        // Configurar tarefas agendadas
        setupCronJobs();

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📊 Dashboard disponível em http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server, io };