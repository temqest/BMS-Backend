const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-maternal-key-change-in-production';

const verifyToken = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied. No Token provided or invalid token"});
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET)

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(403).json({error : "Invalid or expired token"});
    }
};

const checkUserRole = (requiredRoles) => {

    return (req, res, next) => {

        if(!req.user) {
            return res.status(500).json({error : "Internal server error: User not authenticated before role check"});
        }

        if(!requiredRoles.includes(req.user.role)) {
            return res.status(403).json({error: "Access Denied. You do not have permission to perform this action"});
        }

        next();
    };
}

module.exports = {
    verifyToken,
    checkUserRole,
};
