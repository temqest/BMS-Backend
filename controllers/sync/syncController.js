const prisma = require('../../util/db');
const { 
    resolveConflict, 
    CONFLICT_STRATEGIES, 
    getPrimaryKeyField, 
    getConflictingFields 
} = require('../../services/conflicResolution');

const resolveSyncConflict = async (req, res, next) => {
    try {
        const { 
            modelName, 
            recordId, 
            strategy = CONFLICT_STRATEGIES.FIELD_MERGE, 
            customData = {}, 
            clientRecord = {} 
        } = req.body;

        const userId = req.user?.user_id || req.user?.id;

        if (!modelName || !recordId) {
            return res.status(400).json({ 
                error: "Missing required parameters: modelName and recordId are required." 
            });
        }

        const validModels = [
            'mother', 'pregnancy', 'prenatalVisit', 'appointment',
            'supplementation_Record', 'lab_Screening', 'cDSS_Alert',
            'online_Referral', 'delivery_Outcome', 'newborn_Record',
            'postpartum_visit', 'user', 'notification'
        ];

        if (!validModels.includes(modelName)) {
            return res.status(400).json({ 
                error: `Invalid modelName '${modelName}'. Allowed models: ${validModels.join(', ')}` 
            });
        }

        const primaryKey = getPrimaryKeyField(modelName);
        const serverRecord = await prisma[modelName].findUnique({
            where: { [primaryKey]: recordId }
        });

        if (!serverRecord) {
            return res.status(404).json({ 
                error: `Record not found in ${modelName} with ID ${recordId}` 
            });
        }

        const payloadToApply = strategy === CONFLICT_STRATEGIES.CUSTOM 
            ? { ...serverRecord, ...customData }
            : (Object.keys(clientRecord).length > 0 ? clientRecord : customData);

        const result = await resolveConflict({
            tableName: modelName,
            recordId,
            serverRecord,
            clientRecord: payloadToApply,
            strategy,
            userId
        });

        if (req.socketService && serverRecord.facility_id) {
            req.socketService.emitToFacility(serverRecord.facility_id, 'conflict:resolved', {
                modelName,
                recordId,
                strategy,
                resolvedBy: userId,
                updatedAt: new Date()
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            strategyUsed: result.strategyUsed,
            record: result.record
        });

    } catch (error) {
        console.error('[Sync Controller] Error resolving conflict:', error);
        return next(error);
    }
};

const inspectConflict = async (req, res, next) => {
    try {
        const { modelName, recordId } = req.params;
        const clientPayload = req.body || {};

        if (!modelName || !recordId) {
            return res.status(400).json({ error: "modelName and recordId are required." });
        }

        const primaryKey = getPrimaryKeyField(modelName);
        const serverRecord = await prisma[modelName].findUnique({
            where: { [primaryKey]: recordId }
        });

        if (!serverRecord) {
            return res.status(404).json({ error: `Record ${recordId} not found in ${modelName}.` });
        }

        const conflictingFields = getConflictingFields(serverRecord, clientPayload);

        return res.status(200).json({
            modelName,
            recordId,
            serverVersion: serverRecord.version || 1,
            clientVersion: clientPayload.version || 1,
            serverRecord,
            clientPayload,
            conflictingFields
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    resolveSyncConflict,
    inspectConflict
};
