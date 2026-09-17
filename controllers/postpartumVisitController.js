const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

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
            return res.status(400).json({ error: "Required fields are missing" });
        }

        if (!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({ error: "Delivery outcome not found" });
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
            message: "Postpartum visit successfully registered",
            data: postpartumVisit
        });

    } catch (error) {
        return next(error);
    }
};

const updatePostpartumVisit = async (req, res, next) => {
    try {
        const { postpartum_visit_id } = req.params;
        const { strategy, version, ...clientData } = req.body;

        if (!(await validate.isPostpartumVisitExist(postpartum_visit_id))) {
            return res.status(404).json({ error: "Postpartum visit not found" });
        }

        const mvccResult = await updateWithMVCC('postpartum_visit', postpartum_visit_id, { version, ...clientData }, {
            strategy,
            userId: req.user?.user_id || req.user?.id
        });

        if (!mvccResult.resolved) {
            return res.status(409).json({
                error: "Conflict detected requiring manual review",
                details: mvccResult
            });
        }

        return res.status(200).json({
            message: "Postpartum visit updated successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deletePostpartumVisit = async (req, res, next) => {
    try {
        const { postpartum_visit_id } = req.params;

        if (!(await validate.isPostpartumVisitExist(postpartum_visit_id))) {
            return res.status(404).json({ error: "Postpartum visit not found" });
        }

        await prisma.postpartum_visit.delete({
            where: { postpartum_visit_id: postpartum_visit_id }
        });

        return res.status(200).json({
            message: "Postpartum visit deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
};

const getPostpartumVisitById = async (req, res, next) => {
    try {
        const { postpartum_visit_id } = req.params;

        const visit = await validate.isPostpartumVisitExist(postpartum_visit_id);

        if (!visit) {
            return res.status(404).json({ error: "Postpartum visit not found" });
        }

        return res.status(200).json({
            message: "Postpartum visit fetched successfully",
            data: visit
        });

    } catch (error) {
        return next(error);
    }
};

const getPostpartumVisitByDelivery = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        if (!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        const visits = await prisma.postpartum_visit.findMany({
            where: { delivery_id: delivery_id }
        });

        return res.status(200).json({
            message: "Postpartum visits successfully retrieved",
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
