const prisma = require('../util/db');

const MODEL_PRIMARY_KEYS = {
    mother: 'mother_id',
    pregnancy: 'pregnancy_id',
    prenatalVisit: 'visit_id',
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

/**
 * Transparently resolves any temp- or local client ID to its canonical database UUID.
 * @param {string} modelName - Prisma model name (e.g. 'prenatalVisit', 'pregnancy', 'lab_Screening')
 * @param {string} id - Incoming parameter ID from req.params or payload
 * @param {object} payload - Request body or query containing context (mother_id, pregnancy_id, etc.)
 * @returns {Promise<{ resolvedId: string|null, record: object|null }>}
 */
async function resolveEntityId(modelName, id, payload = {}) {
    const primaryKeyField = MODEL_PRIMARY_KEYS[modelName] || `${modelName.toLowerCase()}_id`;

    if (!id) {
        return { resolvedId: null, record: null };
    }

    // 1. Direct primary key lookup
    let record = null;
    try {
        record = await prisma[modelName].findUnique({
            where: { [primaryKeyField]: id }
        });
    } catch (e) {
        record = null;
    }

    if (record) {
        return { resolvedId: record[primaryKeyField], record };
    }

    // 2. Fallback lookup for temp- IDs or unsynced client aliases
    if (typeof id === 'string' && (id.startsWith('temp-') || id.includes('-temp-') || id.startsWith('local-'))) {
        const motherId = payload.mother_id || payload.motherId || payload.targetId || payload.user_id;
        let pregnancyId = payload.pregnancy_id || payload.pregnancyId;

        // Resolve pregnancyId deterministically if mother_id and lmp_date are present
        if (modelName === 'pregnancy' && motherId) {
            try {
                const lmpDate = payload.lmp_date ? new Date(payload.lmp_date) : null;
                if (lmpDate) {
                    record = await prisma.pregnancy.findFirst({
                        where: {
                            OR: [{ mother_id: motherId }, { mother: { user_id: motherId } }],
                            lmp_date: lmpDate
                        }
                    });
                }
            } catch {
                record = null;
            }
        }

        // For prenatal visits, only resolve if pregnancyId and visit_number match deterministically
        if (modelName === 'prenatalVisit' && (pregnancyId || motherId)) {
            try {
                const visitNum = payload.visit_number ? Number(payload.visit_number) : null;
                if (visitNum && pregnancyId && !pregnancyId.startsWith('temp-')) {
                    record = await prisma.prenatalVisit.findFirst({
                        where: {
                            pregnancy_id: pregnancyId,
                            visit_number: visitNum
                        }
                    });
                }
            } catch {
                record = null;
            }
        }

        // For appointments, resolve if user_id, date, and time match deterministically
        if (modelName === 'appointment' && (motherId || payload.user_id)) {
            try {
                const apptDate = payload.appointment_date ? new Date(payload.appointment_date) : null;
                const apptTime = payload.appointment_time;
                const targetUid = payload.user_id || motherId;
                if (apptDate && apptTime && targetUid) {
                    record = await prisma.appointment.findFirst({
                        where: {
                            OR: [{ user_id: targetUid }, { user: { mother: { mother_id: targetUid } } }],
                            appointment_date: apptDate,
                            appointment_time: apptTime
                        }
                    });
                }
            } catch {
                record = null;
            }
        }
    }

    if (record) {
        return { resolvedId: record[primaryKeyField], record };
    }

    return { resolvedId: null, record: null };
}

module.exports = {
    resolveEntityId,
    MODEL_PRIMARY_KEYS
};
