const { pool } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const signToken = (user) =>
    jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
    );

class UserController {
    async register(req, res) {
        try {
            const { name, email, password, phone } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
            }
            if (password.length < 6) {
                return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
            }

            const [existing] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email já registrado' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await pool.execute(
                'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, phone || null]
            );

            // Cria doc no MongoDB com settings default
            await User.create({
                mysql_id: result.insertId,
                name,
                email,
                phone: phone || null,
                settings: {
                    alert_notifications: { email: true, sms: false, push: true },
                    thresholds: User.DEFAULT_THRESHOLDS,
                    system: { auto_resolve: false, daily_report: true, maintenance_mode: false }
                }
            });

            const token = signToken({ id: result.insertId, email });

            res.status(201).json({
                message: 'Usuário registrado com sucesso',
                token,
                user: { id: result.insertId, name, email, phone }
            });
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email e senha são obrigatórios' });
            }

            const [users] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            if (users.length === 0) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const user = users[0];
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            await User.findOneAndUpdate(
                { mysql_id: user.id },
                { last_login: new Date() },
                { upsert: false }
            );

            const token = signToken(user);

            res.json({
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async verifyToken(req, res) {
        try {
            const [users] = await pool.execute(
                'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
                [req.user.id]
            );
            if (users.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            res.json({ user: users[0] });
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const { name, phone, password, currentPassword } = req.body;

            const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
            if (users.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            const user = users[0];

            const updates = [];
            const values = [];

            if (name && name.trim()) {
                updates.push('name = ?');
                values.push(name.trim());
            }
            if (phone !== undefined) {
                updates.push('phone = ?');
                values.push(phone || null);
            }

            if (password) {
                if (!currentPassword) {
                    return res.status(400).json({ error: 'Senha atual obrigatória para trocar senha' });
                }
                const ok = await bcrypt.compare(currentPassword, user.password);
                if (!ok) {
                    return res.status(400).json({ error: 'Senha atual incorreta' });
                }
                if (password.length < 6) {
                    return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
                }
                updates.push('password = ?');
                values.push(await bcrypt.hash(password, 10));
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'Nada para atualizar' });
            }

            values.push(userId);
            await pool.execute(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                values
            );

            // Atualiza espelho no Mongo
            const mongoUpdates = {};
            if (name) mongoUpdates.name = name.trim();
            if (phone !== undefined) mongoUpdates.phone = phone || null;
            if (Object.keys(mongoUpdates).length > 0) {
                await User.updateOne({ mysql_id: parseInt(userId, 10) }, mongoUpdates);
            }

            res.json({ message: 'Perfil atualizado com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async getUserSettings(req, res) {
        try {
            const { userId } = req.params;

            let user = await User.findOne({ mysql_id: parseInt(userId, 10) });
            if (!user) {
                // Se não existir no Mongo, cria com defaults
                const [rows] = await pool.execute(
                    'SELECT id, name, email, phone FROM users WHERE id = ?',
                    [userId]
                );
                if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
                const u = rows[0];
                user = await User.create({
                    mysql_id: u.id,
                    name: u.name,
                    email: u.email,
                    phone: u.phone,
                    settings: {
                        alert_notifications: { email: true, sms: false, push: true },
                        thresholds: User.DEFAULT_THRESHOLDS,
                        system: { auto_resolve: false, daily_report: true, maintenance_mode: false }
                    }
                });
            }

            const [sensors] = await pool.execute(
                'SELECT * FROM sensors WHERE user_id = ?',
                [userId]
            );

            res.json({
                settings: user.settings || {},
                sensors
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

            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ error: 'Settings inválido' });
            }

            const user = await User.findOneAndUpdate(
                { mysql_id: parseInt(userId, 10) },
                { $set: { settings } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

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
