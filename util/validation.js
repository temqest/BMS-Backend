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

const isMessageExist = async (message_id) => {
    try {
        const record = await prisma.in_App_Message.findUnique({where : {message_id}});
        return record !== null;
    } catch (error) {
        console.error("Error in isMessageExist:", error);
        return false;
    }
}

const isOnlineReferralExist = async (referral_id) => {
    try {
        const record = await prisma.online_Referral.findUnique({where : {referral_id}});
        return record !== null;
    } catch (error) {
        console.error("Error in isOnlineReferralExist:", error);
        return false;
    }
}

const isCDSSAlertExist = async (alert_id) => {
    try {
        const record = await prisma.cDSS_Alert.findUnique({ where: { alert_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isCDSSAlertExist:", error);
        return false;
    }
};

const isAppointmentExist = async (appointment_id) => {
    try {
        const record = await prisma.appointment.findUnique({ where: { appointment_id } });
        return record !== null;
    } catch (error) {
        console.error("Error in isAppointmentExist:", error);
        return false;
    }
};

const validateClinicalVitals = (data) => {
    const errors = [];
    const {
        trimester,
        visit_number,
        age_of_gestation_weeks,
        weight_kg,
        temperature_celsius,
        pulse_rate_bpm,
        bp_diastolic,
        bp_systolic,
        fundic_height_cm,
        fetal_heart_tone_bpm,
    } = data;

    if (trimester !== undefined && (trimester < 1 || trimester > 3)) {
        errors.push("Trimester must be between 1 and 3.");
    }
    if (visit_number !== undefined && (visit_number < 1 || visit_number > 20)) {
        errors.push("Visit number must be a positive integer (1-20).");
    }
    if (age_of_gestation_weeks !== undefined && (age_of_gestation_weeks < 1 || age_of_gestation_weeks > 45)) {
        errors.push("Age of gestation must be between 1 and 45 weeks.");
    }
    if (weight_kg !== undefined && (weight_kg < 30 || weight_kg > 250)) {
        errors.push("Weight (kg) must be between 30 and 250 kg.");
    }
    if (temperature_celsius !== undefined && (temperature_celsius < 30.0 || temperature_celsius > 45.0)) {
        errors.push("Temperature (°C) must be between 30.0°C and 45.0°C.");
    }
    if (pulse_rate_bpm !== undefined && (pulse_rate_bpm < 30 || pulse_rate_bpm > 250)) {
        errors.push("Pulse rate (BPM) must be between 30 and 250 BPM.");
    }
    if (bp_systolic !== undefined && (bp_systolic < 50 || bp_systolic > 300)) {
        errors.push("Systolic blood pressure must be between 50 and 300 mmHg.");
    }
    if (bp_diastolic !== undefined && (bp_diastolic < 30 || bp_diastolic > 200)) {
        errors.push("Diastolic blood pressure must be between 30 and 200 mmHg.");
    }
    if (bp_systolic !== undefined && bp_diastolic !== undefined && Number(bp_diastolic) >= Number(bp_systolic)) {
        errors.push("Diastolic BP cannot be equal to or higher than Systolic BP.");
    }
    if (fundic_height_cm !== undefined && fundic_height_cm !== null && (fundic_height_cm < 5 || fundic_height_cm > 60)) {
        errors.push("Fundic height must be between 5 and 60 cm.");
    }
    if (fetal_heart_tone_bpm !== undefined && fetal_heart_tone_bpm !== null && (fetal_heart_tone_bpm < 50 || fetal_heart_tone_bpm > 220)) {
        errors.push("Fetal heart tone must be between 50 and 220 BPM.");
    }

    return errors;
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
    isNotificationExist,
    isMessageExist,
    isOnlineReferralExist,
    isCDSSAlertExist,
    isAppointmentExist,
    validateClinicalVitals,
};
