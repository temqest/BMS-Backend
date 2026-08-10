const prisma = require('../util/db');

async function logAuditTrail({ userId, tableName, actionType, previousState = null, newState = null }) {
    try {
        if (!userId || !tableName || !actionType) {
            console.warn('[AUDIT LOG WARN]: Missing required fields for audit log (userId, tableName, or actionType)');
            return null;
        }

        const formatState = (state) => {
            if (!state) return null;
            return typeof state === 'object' ? JSON.stringify(state) : String(state);
        };

        const auditRecord = await prisma.audit_Revision_Log.create({
            data: {
                user_id: userId,
                table_name: tableName,
                action_type: actionType,
                previous_state: formatState(previousState),
                new_state: formatState(newState),
                sync_status: 'synced',
                client_timestamp: new Date()
            }
        });

        return auditRecord;
    } catch (err) {
        console.error('[AUDIT LOG ERROR]: Failed to create audit log entry:', err.message);
        return null;
    }
}

module.exports = {
    logAuditTrail
};
