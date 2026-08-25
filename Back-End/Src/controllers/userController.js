const { pool } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserController {
    async register(req, res) {
        try {
            const { name, email, password, phone } = req.body;

            // Verificar se usuário já existe
            const [existing] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email já registrado' });
            }

            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, 10);

            // Salvar no MySQL
            const [result] = await pool.execute(
                'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, phone]
            );

            // Salvar no MongoDB
            const user = new User({
                mysql_id: result.insertId,
                name,
                email,
                phone
            });
            await user.save();

            // Gerar token
            const token = jwt.sign(
                { id: result.insertId, email },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '7d' }
            );

            res.status(201).json({
                message: 'Usuário registrado com sucesso',
                token,
                user: {
                    id: result.insertId,
                    name,
                    email,
                    phone
                }
            });
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Buscar usuário no MySQL
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const user = users[0];

            // Verificar senha
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            // Atualizar último login no MongoDB
            await User.findOneAndUpdate(
                { mysql_id: user.id },
                { last_login: new Date() }
            );

            // Gerar token
            const token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }
            });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getUserSettings(req, res) {
        try {
            const { userId } = req.params;

            const user = await User.findOne({ mysql_id: parseInt(userId) });
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // Buscar sensores do usuário
            const [sensors] = await pool.execute(
                'SELECT * FROM sensors WHERE user_id = ?',
                [userId]
            );

            res.json({
                settings: user.settings || {},
                sensors: sensors
            });
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async updateUserSettings(req, res) {
        try {
            const { userId } = req.params;
            const { settings } = req.body;

            const user = await User.findOneAndUpdate(
                { mysql_id: parseInt(userId) },
                { settings },
                { new: true }
            );

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            res.json({
                message: 'Configurações atualizadas com sucesso',
                settings: user.settings
            });
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = new UserController();