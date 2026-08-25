const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        
        // Verificar se o usuário está acessando seus próprios dados
        const userId = parseInt(req.params.userId);
        if (userId && decoded.id !== userId) {
            return res.status(403).json({ error: 'Acesso não autorizado' });
        }

        next();
    } catch (error) {
        console.error('Erro de autenticação:', error);
        return res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = auth;