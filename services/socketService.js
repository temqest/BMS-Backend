const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../util/logger');

let io = null;

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.warn("Warning: JWT_SECRET environment variable is missing.");
    }
    return secret;
};

const initSocket = (httpServer, allowedOrigins = []) => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (
                    allowedOrigins.includes(origin) ||
                    process.env.NODE_ENV === 'development' ||
                    process.env.NODE_ENV !== 'production'
                ) {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'));
            },
            credentials: true,
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || 
                          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user?.user_id || socket.user?.id;
        const facilityId = socket.user?.facility_id;
        const role = socket.user?.role;

        if (userId) {
            const userRoom = `user_${userId}`;
            socket.join(userRoom);
            logger.info('SOCKET', `User ${userId} joined room ${userRoom}`);
        }

        if (facilityId) {
            const facilityRoom = `facility_${facilityId}`;
            socket.join(facilityRoom);
        }

        if (role) {
            const roleRoom = `role_${role}`;
            socket.join(roleRoom);
        }

        socket.on('disconnect', (reason) => {
            if (userId) {
                logger.info('SOCKET', `User ${userId} disconnected (${reason})`);
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized yet.');
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    if (!io || !userId) return;
    io.to(`user_${userId}`).emit(event, data);
};

const emitToUsers = (userIds = [], event, data) => {
    if (!io || !Array.isArray(userIds)) return;
    userIds.forEach((id) => {
        if (id) io.to(`user_${id}`).emit(event, data);
    });
};

const emitToFacility = (facilityId, event, data) => {
    if (!io || !facilityId) return;
    io.to(`facility_${facilityId}`).emit(event, data);
};

const emitToRole = (role, event, data) => {
    if (!io || !role) return;
    io.to(`role_${role}`).emit(event, data);
};

const emitGlobal = (event, data) => {
    if (!io) return;
    io.emit(event, data);
};

module.exports = {
    initSocket,
    getIO,
    emitToUser,
    emitToUsers,
    emitToFacility,
    emitToRole,
    emitGlobal
};
