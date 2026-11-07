const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.warn("Warning: JWT_SECRET environment variable is missing.");
    }
    return secret;
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied. No Token provided or invalid token" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};

const isSuperAdmin = (user) => {
    return !!(user && (user.role === 'SystemAdmin' || user.role === 'SuperAdmin'));
};

const checkUserRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({ error: "Internal server error: User not authenticated before role check" });
        }

        const normalizedRole = req.user.role === 'SuperAdmin' ? 'SystemAdmin' : req.user.role;
        const normalizedRequired = requiredRoles.flatMap(r => (r === 'SuperAdmin' || r === 'SystemAdmin') ? ['SystemAdmin', 'SuperAdmin'] : [r]);

        if (!normalizedRequired.includes(normalizedRole) && !normalizedRequired.includes(req.user.role)) {
            return res.status(403).json({ error: "Access Denied. You do not have permission to perform this action" });
        }

        next();
    };
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required." });
    }

    if (!isSuperAdmin(req.user)) {
        return res.status(403).json({ error: "Access Denied. Only a Super Admin can perform this action." });
    }

    next();
};

const ensureFacilityAccess = (paramKey = 'facility_id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({ error: "Internal server error: User not authenticated" });
        }

        if (isSuperAdmin(req.user)) {
            return next();
        }

        const targetFacilityId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];
        if (targetFacilityId && req.user.facility_id && targetFacilityId !== req.user.facility_id) {
            return res.status(403).json({ error: "Access Denied. You do not have permission to access another facility's records." });
        }

        if (targetFacilityId && !req.user.facility_id) {
            return res.status(403).json({ error: "Access Denied. User has no facility association." });
        }

        next();
    };
};

module.exports = {
    verifyToken,
    checkUserRole,
    isSuperAdmin,
    requireSuperAdmin,
    ensureFacilityAccess
};
