const prisma = require('../util/db');
const { logAuditTrail } = require('./auditService');

const CONFLICT_STRATEGIES = {
    SERVER_WINS: 'SERVER_WINS',
    CLIENT_WINS: 'CLIENT_WINS',
    FIELD_MERGE: 'FIELD_MERGE',
    MANUAL_REVIEW: 'MANUAL_REVIEW'
};

function isConflict(serverRecord, clientRecord) {
    if (!serverRecord) {
        return false;
    }

    const serverVersion = serverRecord.version || 1;
    const clientVersion = clientRecord.version || 1;

    if (serverVersion !== clientVersion) {
        return true;
    }

    return false;
}

function mergeFieldLevel(serverRecord, clientRecord) {
    const ignoredFields = ['version', 'created_at', 'updated_at', 'sync_status'];
    const mergedRecord = Object.assign({}, serverRecord);

    for (const fieldName in clientRecord) {
        if (ignoredFields.includes(fieldName)) {
            continue;
        }

        const clientValue = clientRecord[fieldName];
        if (clientValue !== undefined && clientValue !== null) {
            mergedRecord[fieldName] = clientValue;
        }
    }

    return mergedRecord;
}

async function resolveConflict({ tableName, recordId, serverRecord, clientRecord, strategy, userId }) {
    const chosenStrategy = strategy || CONFLICT_STRATEGIES.FIELD_MERGE;
    const serverVersion = serverRecord.version || 1;
    const newVersion = serverVersion + 1;

    let dataToSave = {};
    let actionLabel = '';

    if (chosenStrategy === CONFLICT_STRATEGIES.SERVER_WINS) {
        if (userId) {
            await logAuditTrail({
                userId: userId,
                tableName: tableName,
                actionType: 'CONFLICT_SERVER_WINS',
                previousState: serverRecord,
                newState: clientRecord
            });
        }

        return {
            resolved: true,
            strategyUsed: CONFLICT_STRATEGIES.SERVER_WINS,
            record: serverRecord,
            message: 'Server record preserved. Client must update local storage.'
        };
    }
    else if (chosenStrategy === CONFLICT_STRATEGIES.CLIENT_WINS) {
        dataToSave = Object.assign({}, clientRecord);
        delete dataToSave.version;
        
        dataToSave.version = newVersion;
        dataToSave.sync_status = 'synced';
        dataToSave.updated_at = new Date();

        actionLabel = 'CLIENT_WINS_OVERWRITTEN';
    }
    else if (chosenStrategy === CONFLICT_STRATEGIES.FIELD_MERGE) {
        const mergedData = mergeFieldLevel(serverRecord, clientRecord);
        delete mergedData.version;
        delete mergedData.updated_at;

        dataToSave = mergedData;
        dataToSave.version = newVersion;
        dataToSave.sync_status = 'synced';
        dataToSave.updated_at = new Date();

        actionLabel = 'FIELD_LEVEL_MERGED';
    }
    else {
        if (userId) {
            await logAuditTrail({
                userId: userId,
                tableName: tableName,
                actionType: 'CONFLICT_PENDING_MANUAL_REVIEW',
                previousState: serverRecord,
                newState: clientRecord
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
        data: dataToSave
    });

    if (userId) {
        await logAuditTrail({
            userId: userId,
            tableName: tableName,
            actionType: 'CONFLICT_RESOLVED_' + actionLabel,
            previousState: serverRecord,
            newState: updatedRecord
        });
    }

    return {
        resolved: true,
        strategyUsed: chosenStrategy,
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
        throw new Error(`Record not found in ${modelName} with ID ${recordId}`);
    }

    const conflictFound = isConflict(serverRecord, clientRecord);
    if (conflictFound) {
        console.warn(`[MVCC CONFLICT] ${modelName}:${recordId} (Server V${serverRecord.version || 1} vs Client V${clientRecord.version || 1})`);

        return await resolveConflict({
            tableName: modelName,
            recordId: recordId,
            serverRecord: serverRecord,
            clientRecord: clientRecord,
            strategy: options.strategy || CONFLICT_STRATEGIES.FIELD_MERGE,
            userId: options.userId || null
        });
    }

    const currentVersion = serverRecord.version || 1;
    const newVersion = currentVersion + 1;

    const updatePayload = Object.assign({}, clientRecord);
    delete updatePayload.version;

    updatePayload.version = newVersion;
    updatePayload.sync_status = 'synced';
    updatePayload.updated_at = new Date();

    const updatedRecord = await prisma[modelName].update({
        where: { [primaryKeyField]: recordId },
        data: updatePayload
    });

    return {
        resolved: true,
        strategyUsed: 'NONE_DIRECT_UPDATE',
        record: updatedRecord,
        message: 'Updated successfully without conflict.'
    };
}

function getPrimaryKeyField(modelName) {
    const keyMap = {
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

    return keyMap[modelName] || `${modelName.toLowerCase()}_id`;
}

module.exports = {
    CONFLICT_STRATEGIES,
    isConflict,
    resolveConflict,
    updateWithMVCC,
    mergeFieldLevel
};
