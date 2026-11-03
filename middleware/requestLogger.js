const logger = require('../util/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req, res, duration);
    });

    next();
};

module.exports = requestLogger;
