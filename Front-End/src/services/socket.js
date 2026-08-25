import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map();
    }

    connect(userId) {
        if (this.socket && this.connected) {
            return this.socket;
        }

        const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
        
        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
            auth: {
                userId: userId
            }
        });

        this.setupEventListeners();

        return this.socket;
    }

    setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log('✅ Socket conectado');
            this.emit('authenticate', { userId: this.socket.auth.userId });
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('❌ Socket desconectado:', reason);
        });

        this.socket.on('connect_error', (error) => {
            this.reconnectAttempts++;
            console.error('❌ Erro de conexão socket:', error);
        });

        this.socket.on('reconnect', () => {
            this.connected = true;
            console.log('🔄 Socket reconectado');
        });

        this.socket.on('reconnect_failed', () => {
            console.error('❌ Falha na reconexão do socket');
        });
    }

    // Método para emitir eventos
    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn('⚠️ Socket não conectado, evento não enviado:', event);
        }
    }

    // Método para ouvir eventos
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }

        return () => this.off(event, callback);
    }

    // Método para remover listeners
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    // Método para remover todos os listeners de um evento
    offAll(event) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).clear();
        }
        if (this.socket) {
            this.socket.off(event);
        }
    }

    // Método para desconectar
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // Método para reconectar
    reconnect() {
        if (this.socket) {
            this.socket.connect();
        }
    }

    // Método para verificar se está conectado
    isConnected() {
        return this.connected && this.socket?.connected;
    }

    // Método para obter o ID da conexão
    getSocketId() {
        return this.socket?.id || null;
    }

    // Método para enviar com confirmação
    emitWithAck(event, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                reject(new Error('Socket não conectado'));
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout ao enviar evento'));
            }, timeout);

            this.socket.emit(event, data, (response) => {
                clearTimeout(timeoutId);
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Método para eventos específicos do Hydrovel
    joinUserRoom(userId) {
        this.emit('join_room', { room: `user_${userId}` });
    }

    leaveUserRoom(userId) {
        this.emit('leave_room', { room: `user_${userId}` });
    }

    // Listeners específicos
    onNewAlert(callback) {
        return this.on('new_alert', callback);
    }

    onAlertRead(callback) {
        return this.on('alert_read', callback);
    }

    onAlertResolved(callback) {
        return this.on('alert_resolved', callback);
    }

    onSensorUpdate(callback) {
        return this.on('sensor_update', callback);
    }

    onSystemStatus(callback) {
        return this.on('system_status', callback);
    }

    onNotification(callback) {
        return this.on('notification', callback);
    }

    // Método para enviar status do sistema
    sendSystemStatus(status) {
        this.emit('system_status_update', status);
    }

    // Método para enviar leitura de sensor em tempo real
    sendSensorReading(data) {
        this.emit('sensor_reading', data);
    }
}

// Singleton
const socketService = new SocketService();
export default socketService;