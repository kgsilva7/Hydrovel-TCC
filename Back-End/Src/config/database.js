const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hydrovel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Criar tabelas se não existirem
const initDatabase = async () => {
    try {
        // Tabela de usuários
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Tabela de sensores
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS sensors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                sensor_type ENUM('flow', 'pressure', 'ph', 'turbidity', 'temperature') NOT NULL,
                location VARCHAR(100),
                status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Tabela de leituras
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS readings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sensor_id INT,
                value DECIMAL(10, 3),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
            )
        `);

        // Tabela de alertas
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                type ENUM('leak', 'quality', 'pressure', 'flow', 'temperature') NOT NULL,
                severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
                message TEXT,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Banco de dados MySQL inicializado');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
    }
};

module.exports = { pool: promisePool, initDatabase };