const prisma = require('../util/db');
const { isUserExist, isMotherExist, isPregnancyExist, isFacilityExist, isPrenatalVisitExist, isDeliveryOutcomeExist, isNewbornExist, isPostpartumVisitExist, isLabScreeningExist, isImmunizationRecordExist, isSupplementRecordExist, isNotificationExist } = require('../util/validation');


const registerPostpartumVisit = async (req, res, next) => {
    try {
        const {
            delivery_id,
            visit_date,
            visit_number,
            weight_kg,
            temperature_celsius,
            pulse_rate_bpm,
            bp_diastolic,
            bp_systolic,
            fundic_height_cm,
            chief_complaint,
            danger_signs_observed,
            risk_level_assessed,
            vitamin_a_given,
            iron_supplement_given
        } = req.body;

        if (!delivery_id || visit_number === undefined || weight_kg === undefined || temperature_celsius === undefined || pulse_rate_bpm === undefined || bp_diastolic === undefined || bp_systolic === undefined) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        const _existingDelivery = await isDeliveryOutcomeExist(delivery_id);

        if(!__existingDelivery) {
            return res.status(404).json({error: "Delivery Outcome Not Found!"});
        }

        const postpartumVisit = await prisma.postpartum_visit.create({
            data: {
                delivery_id,
                visit_date: visit_date ? new Date(visit_date) : undefined,
                visit_number,
                weight_kg,
                temperature_celsius,
                pulse_rate_bpm,
                bp_diastolic,
                bp_systolic,
                fundic_height_cm,
                chief_complaint,
                danger_signs_observed,
                risk_level_assessed,
                vitamin_a_given: vitamin_a_given || false,
                iron_supplement_given: iron_supplement_given || false,
                sync_status: "synced"
            }
        });

        return res.status(200).json({
            message: "Postpartum Visit Successfully Registered!",
            data: postpartumVisit
        });
    } catch (error) {
        return next(error);
    }
};

const updatePostpartumVisit = async (req, res, next) => {
    try {
        const { postpartum_visit_id } = req.params;
        const {
            visit_date,
            visit_number,
            weight_kg,
            temperature_celsius,
            pulse_rate_bpm,
            bp_diastolic,
            bp_systolic,
            fundic_height_cm,
            chief_complaint,
            danger_signs_observed,
            risk_level_assessed,
            vitamin_a_given,
            iron_supplement_given
        } = req.body;

        const _isVisitExist = await isPostpartumVisitExist(postpartum_visit_id);

        if(!__isVisitExist) {
            return res.status(404).json({error: "Postpartum Visit Not Found!"});
        }

        if (visit_number === undefined || weight_kg === undefined || temperature_celsius === undefined || pulse_rate_bpm === undefined || bp_diastolic === undefined || bp_systolic === undefined) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        const updatedVisit = await prisma.postpartum_visit.update({
            where: { postpartum_visit_id: postpartum_visit_id },
            data: {
                visit_date: visit_date ? new Date(visit_date) : undefined,
                visit_number,
                weight_kg,
                temperature_celsius,
                pulse_rate_bpm,
                bp_diastolic,
                bp_systolic,
                fundic_height_cm,
                chief_complaint,
                danger_signs_observed,
                risk_level_assessed,
                vitamin_a_given,
                iron_supplement_given
            }
        });

        return res.status(200).json({
            message: "Postpartum Visit Updated Successfully!",
            data: updatedVisit
        });
    } catch (error) {
        return next(error);
    }
};

const deletePostpartumVisit = async (req, res, next) => {
    try {
        const { postpartum_visit_id } = req.params;

        const _isVisitExist = await isPostpartumVisitExist(postpartum_visit_id);

        if(!__isVisitExist) {
            return res.status(404).json({error: "Postpartum Visit Not Found!"});
        }

        await prisma.postpartum_visit.delete({
            where: { postpartum_visit_id: postpartum_visit_id }
        });

        return res.status(200).json({
            message: "Postpartum Visit Deleted Successfully!"
        });
    } catch (error) {
        return next(error);
    }
};

const getPostpartumVisitById = async (req, res, next) => {
    try {
        const { postpartum_visit_id } = req.params;

        const _isVisitExist = await isPostpartumVisitExist(postpartum_visit_id);

        if(!__isVisitExist) {
            return res.status(404).json({error: "Postpartum Visit Not Found!"});
        }

        return res.status(200).json({
            message: "Postpartum Visit Fetched Successfully!",
            data: isVisitExist
        });
    } catch (error) {
        return next(error);
    }
};

const getPostpartumVisitByDelivery = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        const _isDeliveryExist = await isDeliveryOutcomeExist(delivery_id);

        if(!__isDeliveryExist) {
            return res.status(404).json({error: "Delivery Outcome Not Found!"});
        }

        const visits = await prisma.postpartum_visit.findMany({
            where: { delivery_id: delivery_id }
        });

        return res.status(200).json({
            message: "Postpartum Visits Successfully Retrieved",
            data: visits
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerPostpartumVisit,
    updatePostpartumVisit,
    deletePostpartumVisit,
    getPostpartumVisitById,
    getPostpartumVisitByDelivery
};
