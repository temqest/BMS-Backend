const { PrismaClient } = require('@prisma/client');

const shouldLogQueries = process.env.DEBUG_SQL === 'true' || process.env.LOG_SQL === 'true';

const prisma = new PrismaClient({
    log: shouldLogQueries 
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error']
});

module.exports = prisma;
