const prisma = require('./db');

const isUserExist = async (user_id) => {
    try {
        const record = await prisma.user.findUnique({ where: { user_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isUserExist:", error);
        return false;
    }
};

const isMotherExist = async (mother_id) => {
    try {
        const record = await prisma.mother.findUnique({ where: { mother_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isMotherExist:", error);
        return false;
    }
};

const isPregnancyExist = async (pregnancy_id) => {
    try {
        const record = await prisma.pregnancy.findUnique({ where: { pregnancy_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isPregnancyExist:", error);
        return false;
    }
};

const isFacilityExist = async (facility_id) => {
    try {
        const record = await prisma.facility.findUnique({ where: { facility_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isFacilityExist:", error);
        return false;
    }
};

const isPrenatalVisitExist = async (visit_id) => {
    try {
        const record = await prisma.prenatalVisit.findUnique({ where: { visit_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isPrenatalVisitExist:", error);
        return false;
    }
};

const isDeliveryOutcomeExist = async (delivery_id) => {
    try {
        const record = await prisma.delivery_Outcome.findUnique({ where: { delivery_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isDeliveryOutcomeExist:", error);
        return false;
    }
};

const isNewbornExist = async (newborn_id) => {
    try {
        const record = await prisma.newborn_Record.findUnique({ where: { newborn_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isNewbornExist:", error);
        return false;
    }
};

const isPostpartumVisitExist = async (postpartum_visit_id) => {
    try {
        const record = await prisma.postpartum_visit.findUnique({ where: { postpartum_visit_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isPostpartumVisitExist:", error);
        return false;
    }
};

const isLabScreeningExist = async (screening_id) => {
    try {
        const record = await prisma.lab_Screening.findUnique({ where: { screening_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isLabScreeningExist:", error);
        return false;
    }
};

const isImmunizationRecordExist = async (immunization_id) => {
    try {
        const record = await prisma.immunization_Record.findUnique({ where: { immunization_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isImmunizationRecordExist:", error);
        return false;
    }
};

const isSupplementRecordExist = async (supplement_id) => {
    try {
        const record = await prisma.supplementation_Record.findUnique({ where: { supplement_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isSupplementRecordExist:", error);
        return false;
    }
};

const isNotificationExist = async (notification_id) => {
    try {
        const record = await prisma.notification.findUnique({ where: { notification_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isNotificationExist:", error);
        return false;
    }
};

module.exports = {
    isUserExist,
    isMotherExist,
    isPregnancyExist,
    isFacilityExist,
    isPrenatalVisitExist,
    isDeliveryOutcomeExist,
    isNewbornExist,
    isPostpartumVisitExist,
    isLabScreeningExist,
    isImmunizationRecordExist,
    isSupplementRecordExist,
    isNotificationExist
};
