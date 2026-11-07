const prisma = require('../../util/db');
const validate = require('../../util/validation');
const { updateWithMVCC } = require('../../services/conflicResolution');
const { verifyFacilityReadAccess, verifyFacilityWriteAccess } = require('../../services/facilityTransferAccess');

const registerPostpartumVisit = async (req, res, next) => {
    try {
        const {
            delivery_id,
            visit_timing,
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
            foul_smelling_discharge,
            cord_condition_normal,
            vitamin_a_given,
            iron_supplement_given,
            fp_method_accepted,
            fp_quantity_given,
            fp_follow_up_date
        } = req.body;

        if (!delivery_id || visit_number === undefined || weight_kg === undefined || temperature_celsius === undefined || pulse_rate_bpm === undefined || bp_diastolic === undefined || bp_systolic === undefined) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const delivery = await prisma.delivery_Outcome.findUnique({
            where: { delivery_id },
            include: { pregnancy: { select: { mother_id: true } } }
        });

        if (!delivery) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        const writeAccess = await verifyFacilityWriteAccess(delivery.pregnancy?.mother_id, req.user);
        if (!writeAccess.allowed) {
            return res.status(403).json({ error: writeAccess.error });
        }

        const postpartumVisit = await prisma.postpartum_visit.create({
            data: {
                delivery_id,
                visit_timing: visit_timing || null,
                visit_date: visit_date ? new Date(visit_date) : undefined,
                visit_number: Number(visit_number),
                weight_kg: parseFloat(weight_kg),
                temperature_celsius: parseFloat(temperature_celsius),
                pulse_rate_bpm: parseInt(pulse_rate_bpm, 10),
                bp_diastolic: parseInt(bp_diastolic, 10),
                bp_systolic: parseInt(bp_systolic, 10),
                fundic_height_cm: (fundic_height_cm !== undefined && fundic_height_cm !== null && fundic_height_cm !== '') ? parseFloat(fundic_height_cm) : null,
                chief_complaint: chief_complaint || null,
                danger_signs_observed: danger_signs_observed || null,
                risk_level_assessed: risk_level_assessed || null,
                foul_smelling_discharge: Boolean(foul_smelling_discharge),
                cord_condition_normal: cord_condition_normal !== undefined ? Boolean(cord_condition_normal) : true,
                vitamin_a_given: Boolean(vitamin_a_given),
                iron_supplement_given: Boolean(iron_supplement_given),
                fp_method_accepted: fp_method_accepted || null,
                fp_quantity_given: (fp_quantity_given !== undefined && fp_quantity_given !== null && fp_quantity_given !== '') ? parseInt(fp_quantity_given, 10) : null,
                fp_follow_up_date: fp_follow_up_date ? new Date(fp_follow_up_date) : null,
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

        const formattedData = { ...clientData };
        if (formattedData.visit_date !== undefined) {
            formattedData.visit_date = formattedData.visit_date ? new Date(formattedData.visit_date) : null;
        }
        if (formattedData.fp_follow_up_date !== undefined) {
            formattedData.fp_follow_up_date = formattedData.fp_follow_up_date ? new Date(formattedData.fp_follow_up_date) : null;
        }
        if (formattedData.weight_kg !== undefined) {
            formattedData.weight_kg = (formattedData.weight_kg !== null && formattedData.weight_kg !== '') ? parseFloat(formattedData.weight_kg) : null;
        }
        if (formattedData.temperature_celsius !== undefined) {
            formattedData.temperature_celsius = (formattedData.temperature_celsius !== null && formattedData.temperature_celsius !== '') ? parseFloat(formattedData.temperature_celsius) : null;
        }
        if (formattedData.fundic_height_cm !== undefined) {
            formattedData.fundic_height_cm = (formattedData.fundic_height_cm !== null && formattedData.fundic_height_cm !== '') ? parseFloat(formattedData.fundic_height_cm) : null;
        }
        if (formattedData.fp_quantity_given !== undefined) {
            formattedData.fp_quantity_given = (formattedData.fp_quantity_given !== null && formattedData.fp_quantity_given !== '') ? parseInt(formattedData.fp_quantity_given, 10) : null;
        }
        const boolFields = [
            'foul_smelling_discharge',
            'cord_condition_normal',
            'vitamin_a_given',
            'iron_supplement_given'
        ];
        for (const field of boolFields) {
            if (formattedData[field] !== undefined) {
                formattedData[field] = Boolean(formattedData[field]);
            }
        }

        const mvccResult = await updateWithMVCC('postpartum_visit', postpartum_visit_id, { version, ...formattedData }, {
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

        const visit = await prisma.postpartum_visit.findUnique({
            where: { postpartum_visit_id: postpartum_visit_id },
            include: {
                delivery: {
                    include: {
                        pregnancy: {
                            select: {
                                mother_id: true,
                                pregnancy_id: true
                            }
                        }
                    }
                }
            }
        });

        if (!visit) {
            return res.status(404).json({ error: "Postpartum visit not found" });
        }

        const access = await verifyFacilityReadAccess(visit.delivery?.pregnancy?.mother_id, req.user, visit.delivery?.pregnancy?.pregnancy_id);
        if (!access.allowed) {
            return res.status(403).json({ error: access.error });
        }

        if (access.dateFilter && access.dateFilter.lte && new Date(visit.visit_date) > new Date(access.dateFilter.lte)) {
            return res.status(403).json({ error: "Access denied. Postpartum visit occurred after patient was transferred." });
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

        const delivery = await prisma.delivery_Outcome.findUnique({
            where: { delivery_id },
            include: { pregnancy: { select: { mother_id: true, pregnancy_id: true } } }
        });

        if (!delivery) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        const access = await verifyFacilityReadAccess(delivery.pregnancy?.mother_id, req.user, delivery.pregnancy?.pregnancy_id);
        if (!access.allowed) {
            return res.status(403).json({ error: access.error });
        }

        const visitWhere = { delivery_id: delivery_id };
        if (access.dateFilter) visitWhere.visit_date = access.dateFilter;

        const visits = await prisma.postpartum_visit.findMany({
            where: visitWhere
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
