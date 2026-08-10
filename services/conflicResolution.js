const prisma = require('../util/db');
const { logAuditTrail } = require('./auditService');

const CONFLICT_STRATEGIES = {
    SERVER_WINS: 'SERVER_WINS',
    CLIENT_WINS: 'CLIENT_WINS',
    FIELD_MERGE: 'FIELD_MERGE',
    MANUAL_REVIEW: 'MANUAL_REVIEW'
};

function isConflict(serverRecord, clientRecord) {
    if (!serverRecord) return false;
    const serverVersion = serverRecord.version ?? 1;
    const clientVersion = clientRecord.version ?? 1;
    
    return serverVersion !== clientVersion;
}

function mergeFieldLevel(serverRecord, clientRecord, ignoredFields = ['version', 'created_at', 'updated_at', 'sync_status']) {
    const merged = { ...serverRecord };

    for (const key of Object.keys(clientRecord)) {
        if (ignoredFields.includes(key)) continue;
        
        if (clientRecord[key] !== undefined && clientRecord[key] !== null) {
            merged[key] = clientRecord[key];
        }
    }

    return merged;
}

async function resolveConflict({
    tableName,
    recordId,
    serverRecord,
    clientRecord,
    strategy = CONFLICT_STRATEGIES.FIELD_MERGE,
    userId = null
}) {
    const serverVersion = serverRecord.version ?? 1;
    const newVersion = serverVersion + 1;

    let finalData = {};
    let resolutionAction = '';

    switch (strategy) {
        case CONFLICT_STRATEGIES.SERVER_WINS:
            resolutionAction = 'SERVER_WINS_PRESERVED_EXISTING';
            
            if (userId) {
                await logConflictAudit({
                    userId,
                    tableName,
                    actionType: 'CONFLICT_SERVER_WINS',
                    previousState: JSON.stringify(serverRecord),
                    newState: JSON.stringify(clientRecord)
                });
            }

            return {
                resolved: true,
                strategyUsed: CONFLICT_STRATEGIES.SERVER_WINS,
                record: serverRecord,
                message: 'Server record preserved. Client must update local offline storage.'
            };

        case CONFLICT_STRATEGIES.CLIENT_WINS:
            const { version: _cv, ...clientDataWithoutVersion } = clientRecord;
            finalData = {
                ...clientDataWithoutVersion,
                version: newVersion,
                sync_status: 'synced',
                updated_at: new Date()
            };
            resolutionAction = 'CLIENT_WINS_OVERWRITTEN';
            break;

        case CONFLICT_STRATEGIES.FIELD_MERGE:
            const mergedFields = mergeFieldLevel(serverRecord, clientRecord);
            delete mergedFields.version;
            delete mergedFields.updated_at;

            finalData = {
                ...mergedFields,
                version: newVersion,
                sync_status: 'synced',
                updated_at: new Date()
            };
            resolutionAction = 'FIELD_LEVEL_MERGED';
            break;

        case CONFLICT_STRATEGIES.MANUAL_REVIEW:
        default:
            if (userId) {
                await logConflictAudit({
                    userId,
                    tableName,
                    actionType: 'CONFLICT_PENDING_MANUAL_REVIEW',
                    previousState: JSON.stringify(serverRecord),
                    newState: JSON.stringify(clientRecord)
                });
            }

            return {
                resolved: false,
                strategyUsed: CONFLICT_STRATEGIES.MANUAL_REVIEW,
                record: serverRecord,
                conflictPayload: clientRecord,
                message: 'Conflict flagged for manual resolution.'
            };
    }

    const primaryKeyField = getPrimaryKeyField(tableName);
    const updatedRecord = await prisma[tableName].update({
        where: { [primaryKeyField]: recordId },
        data: finalData
    });

    if (userId) {
        await logConflictAudit({
            userId,
            tableName,
            actionType: `CONFLICT_RESOLVED_${resolutionAction}`,
            previousState: JSON.stringify(serverRecord),
            newState: JSON.stringify(updatedRecord)
        });
    }

    return {
        resolved: true,
        strategyUsed: strategy,
        record: updatedRecord,
        message: 'Conflict successfully resolved and merged.'
    };
}

async function updateWithMVCC(modelName, recordId, clientRecord, options = {}) {
    const primaryKeyField = getPrimaryKeyField(modelName);

    const serverRecord = await prisma[modelName].findUnique({
        where: { [primaryKeyField]: recordId }
    });

    if (!serverRecord) {
        throw new Error(`Record not found in ${modelName} with key ${recordId}`);
    }

    if (isConflict(serverRecord, clientRecord)) {
        console.warn(`[MVCC CONFLICT] ${modelName}:${recordId} - Server Version: ${serverRecord.version ?? 1}, Client Version: ${clientRecord.version ?? 1}`);
        
        return await resolveConflict({
            tableName: modelName,
            recordId,
            serverRecord,
            clientRecord,
            strategy: options.strategy || CONFLICT_STRATEGIES.FIELD_MERGE,
            userId: options.userId || null
        });
    }

    const newVersion = (serverRecord.version ?? 1) + 1;
    const { version: _v, ...updateData } = clientRecord;

    const updatedRecord = await prisma[modelName].update({
        where: { [primaryKeyField]: recordId },
        data: {
            ...updateData,
            version: newVersion,
            sync_status: 'synced',
            updated_at: new Date()
        }
    });

    return {
        resolved: true,
        strategyUsed: 'NONE_DIRECT_UPDATE',
        record: updatedRecord,
        message: 'Updated successfully without conflict.'
    };
}

function getPrimaryKeyField(modelName) {
    const pkMap = {
        facility: 'facility_id',
        user: 'user_id',
        mother: 'mother_id',
        pregnancy: 'pregnancy_id',
        prenatalVisit: 'visit_id',
        immunization_Record: 'immunization_id',
        supplementation_Record: 'supplement_id',
        lab_Screening: 'screening_id',
        cDSS_Alert: 'alert_id',
        online_Referral: 'referral_id',
        delivery_Outcome: 'delivery_id',
        newborn_Record: 'newborn_id',
        postpartum_visit: 'postpartum_visit_id',
        appointment: 'appointment_id',
        notification: 'notification_id',
        in_App_Message: 'message_id'
    };

    return pkMap[modelName] || `${modelName.toLowerCase()}_id`;
}

async function logConflictAudit({ userId, tableName, actionType, previousState, newState }) {
    await logAuditTrail({
        userId,
        tableName,
        actionType,
        previousState,
        newState
    });
}

module.exports = {
    CONFLICT_STRATEGIES,
    isConflict,
    resolveConflict,
    updateWithMVCC,
    mergeFieldLevel
};
