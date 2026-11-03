const prisma = require('../util/db');

async function getTransferVisitDateFilter(motherId, pregnancyId, user) {
    if (!user || user.role === 'SystemAdmin' || user.role === 'Mother') {
        return null;
    }

    const userFacilityId = user.facility_id;
    if (!userFacilityId) {
        return null;
    }

    const enrollment = await prisma.mother_Facility_Enrollment.findUnique({
        where: {
            mother_id_facility_id: {
                mother_id: motherId,
                facility_id: userFacilityId
            }
        }
    });

    if (enrollment && enrollment.status === 'Transferred') {
        const transferReferral = await prisma.online_Referral.findFirst({
            where: {
                pregnancy_id: pregnancyId,
                from_facility_id: userFacilityId,
                status: { in: ['accepted', 'completed', 'transferred'] }
            },
            orderBy: { date_responded: 'desc' }
        });

        const cutoffDate = transferReferral?.date_responded || transferReferral?.date_referred || enrollment.updated_at;
        if (cutoffDate) {
            return { lte: cutoffDate };
        }
    }

    return null;
}

async function verifyFacilityWriteAccess(motherId, user) {
    if (!user || user.role === 'SystemAdmin') {
        return { allowed: true };
    }

    const userFacilityId = user.facility_id;
    if (!userFacilityId) {
        return { allowed: true };
    }

    const enrollment = await prisma.mother_Facility_Enrollment.findUnique({
        where: {
            mother_id_facility_id: {
                mother_id: motherId,
                facility_id: userFacilityId
            }
        }
    });

    if (enrollment && enrollment.status === 'Transferred') {
        return {
            allowed: false,
            error: "Access denied. Patient has been transferred to another facility and cannot receive new clinical records here."
        };
    }

    return { allowed: true };
}

module.exports = {
    getTransferVisitDateFilter,
    verifyFacilityWriteAccess
};

