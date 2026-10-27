const jwt = require('jsonwebtoken');

/**
 * Verifica o JWT e compara o ID do token com o userId (param OU body).
 * Bloqueia IDOR quando o ID do token não bate com o recurso acessado.
 */
const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        // id do recurso pode vir por params, body ou query
        const resourceUserId = req.params.userId
            ? parseInt(req.params.userId, 10)
            : req.body?.userId
                ? parseInt(req.body.userId, 10)
                : req.query?.userId
                    ? parseInt(req.query.userId, 10)
                    : null;

        if (resourceUserId !== null && !Number.isNaN(resourceUserId) && resourceUserId !== decoded.id) {
            return res.status(403).json({ error: 'Acesso não autorizado' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        console.error('Erro de autenticação:', error.message);
        return res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = auth;
