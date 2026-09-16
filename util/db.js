const { PrismaClient } = require('@prisma/client');

// Prisma Client Singleton with updated schema models
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
});

module.exports = prisma;

