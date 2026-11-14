const prisma = require('../util/db');

function isSuperAdminUser(user) {
    return !!(user && (user.role === 'SystemAdmin' || user.role === 'SuperAdmin'));
}

async function getTransferVisitDateFilter(motherId, pregnancyId, user) {
    if (!user || isSuperAdminUser(user) || user.role === 'Mother') {
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

async function verifyFacilityReadAccess(motherId, user, pregnancyId = null) {
    if (!user || isSuperAdminUser(user)) {
        return { allowed: true, dateFilter: null };
    }

    if (user.role === 'Mother') {
        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: motherId },
                    { user_id: motherId }
                ]
            },
            select: { user_id: true }
        });

        if (motherRecord && motherRecord.user_id === user.user_id) {
            return { allowed: true, dateFilter: null };
        }
        return { allowed: false, error: "Access denied. You can only view your own health records." };
    }

    const userFacilityId = user.facility_id;
    if (!userFacilityId) {
        return { allowed: false, error: "Access denied. Healthcare staff must belong to a facility." };
    }

    const mother = await prisma.mother.findFirst({
        where: {
            OR: [
                { mother_id: motherId },
                { user_id: motherId }
            ]
        },
        include: {
            user: { select: { facility_id: true } },
            facilityEnrollments: { where: { facility_id: userFacilityId } }
        }
    });

    if (!mother) {
        return { allowed: false, error: "Patient record not found." };
    }

    const isHomeFacility = mother.user?.facility_id === userFacilityId;
    const enrollment = mother.facilityEnrollments?.[0];

    let hasReferralRelation = false;
    if (!isHomeFacility && !enrollment) {
        const activeReferral = await prisma.online_Referral.findFirst({
            where: {
                pregnancy: { mother_id: mother.mother_id },
                OR: [
                    { from_facility_id: userFacilityId },
                    { to_facility_id: userFacilityId }
                ]
            }
        });
        hasReferralRelation = !!activeReferral;
    }

    if (!isHomeFacility && !enrollment && !hasReferralRelation) {
        return { allowed: false, error: "Access denied. Patient is not affiliated with your facility." };
    }

    if (enrollment && enrollment.status === 'Transferred') {
        const dateFilter = await getTransferVisitDateFilter(mother.mother_id, pregnancyId, user);
        return { allowed: true, dateFilter, isTransferred: true };
    }

    return { allowed: true, dateFilter: null, isTransferred: false };
}

async function verifyFacilityWriteAccess(motherId, user) {
    if (!user || isSuperAdminUser(user)) {
        return { allowed: true };
    }

    if (user.role === 'Mother') {
        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: motherId },
                    { user_id: motherId }
                ]
            },
            select: { user_id: true }
        });

        if (motherRecord && motherRecord.user_id === user.user_id) {
            return { allowed: true };
        }
        return { allowed: false, error: "Access denied. You can only manage your own health records." };
    }

    const userFacilityId = user.facility_id;
    if (!userFacilityId) {
        return { allowed: false, error: "Access denied. Healthcare staff must belong to a facility." };
    }

    const mother = await prisma.mother.findFirst({
        where: {
            OR: [
                { mother_id: motherId },
                { user_id: motherId }
            ]
        },
        include: {
            user: { select: { facility_id: true } },
            facilityEnrollments: { where: { facility_id: userFacilityId } }
        }
    });

    if (!mother) {
        return { allowed: false, error: "Patient record not found." };
    }

    const isHomeFacility = mother.user?.facility_id === userFacilityId;
    const enrollment = mother.facilityEnrollments?.[0];

    if (!isHomeFacility && !enrollment) {
        const activeIncomingReferral = await prisma.online_Referral.findFirst({
            where: {
                pregnancy: { mother_id: mother.mother_id },
                to_facility_id: userFacilityId,
                status: { in: ['accepted', 'completed', 'transferred'] }
            }
        });

        if (!activeIncomingReferral) {
            return {
                allowed: false,
                error: "Access denied. Your facility does not have active care authorization for this patient."
            };
        }
    }

    if (enrollment && enrollment.status === 'Transferred') {
        return {
            allowed: false,
            error: "Access denied. Patient has been transferred to another facility and cannot receive new clinical records here."
        };
    }

    return { allowed: true };
}

module.exports = {
    isSuperAdminUser,
    getTransferVisitDateFilter,
    verifyFacilityReadAccess,
    verifyFacilityWriteAccess
};
