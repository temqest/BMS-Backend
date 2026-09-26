const prisma = require('../../util/db');
const validate = require('../../util/validation');
const { updateWithMVCC } = require('../../services/conflicResolution');

const registerDeliveryOutcome = async (req, res, next) => {
    try {
        const { 
            pregnancy_id, 
            delivery_date, 
            place_of_delivery, 
            mode_of_delivery, 
            duration_of_labor_hours, 
            blood_loss_ml, 
            delivery_complications,
            newborns,
            postpartum_visit 
        } = req.body;

        if (!pregnancy_id || !place_of_delivery || !mode_of_delivery) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        if (!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy not found" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const deliveryOutcome = await tx.delivery_Outcome.create({
                data: {
                    pregnancy_id,
                    delivery_date: delivery_date ? new Date(delivery_date) : new Date(),
                    place_of_delivery,
                    mode_of_delivery,
                    duration_of_labor_hours: duration_of_labor_hours ? parseFloat(duration_of_labor_hours) : null,
                    blood_loss_ml: blood_loss_ml ? parseInt(blood_loss_ml, 10) : null,
                    delivery_complications: delivery_complications || null,
                    sync_status: "synced"
                }
            });

            if (Array.isArray(newborns) && newborns.length > 0) {
                for (const nb of newborns) {
                    await tx.newborn_Record.create({
                        data: {
                            delivery_id: deliveryOutcome.delivery_id,
                            sex: nb.sex || "Unknown",
                            birth_weight_kg: nb.birth_weight_kg ? parseFloat(nb.birth_weight_kg) : 3.0,
                            status_at_birth: nb.status_at_birth || "Alive",
                            apgar_score: nb.apgar_score !== undefined ? parseInt(nb.apgar_score, 10) : 9,
                            sync_status: "synced"
                        }
                    });
                }
            } else if (req.body.sex && req.body.birth_weight_kg) {
                await tx.newborn_Record.create({
                    data: {
                        delivery_id: deliveryOutcome.delivery_id,
                        sex: req.body.sex,
                        birth_weight_kg: parseFloat(req.body.birth_weight_kg),
                        status_at_birth: req.body.status_at_birth || "Alive",
                        apgar_score: req.body.apgar_score !== undefined ? parseInt(req.body.apgar_score, 10) : 9,
                        sync_status: "synced"
                    }
                });
            }

            if (postpartum_visit) {
                await tx.postpartum_visit.create({
                    data: {
                        delivery_id: deliveryOutcome.delivery_id,
                        visit_date: postpartum_visit.visit_date ? new Date(postpartum_visit.visit_date) : new Date(),
                        visit_number: postpartum_visit.visit_number || 1,
                        weight_kg: postpartum_visit.weight_kg ? parseFloat(postpartum_visit.weight_kg) : 55,
                        temperature_celsius: postpartum_visit.temperature_celsius ? parseFloat(postpartum_visit.temperature_celsius) : 36.5,
                        pulse_rate_bpm: postpartum_visit.pulse_rate_bpm ? parseInt(postpartum_visit.pulse_rate_bpm, 10) : 80,
                        bp_diastolic: postpartum_visit.bp_diastolic ? parseInt(postpartum_visit.bp_diastolic, 10) : 80,
                        bp_systolic: postpartum_visit.bp_systolic ? parseInt(postpartum_visit.bp_systolic, 10) : 120,
                        fundic_height_cm: postpartum_visit.fundic_height_cm ? parseFloat(postpartum_visit.fundic_height_cm) : null,
                        chief_complaint: postpartum_visit.chief_complaint || null,
                        danger_signs_observed: postpartum_visit.danger_signs_observed || null,
                        risk_level_assessed: postpartum_visit.risk_level_assessed || "Low Risk",
                        vitamin_a_given: Boolean(postpartum_visit.vitamin_a_given),
                        iron_supplement_given: Boolean(postpartum_visit.iron_supplement_given),
                        sync_status: "synced"
                    }
                });
            }

            await tx.pregnancy.update({
                where: { pregnancy_id },
                data: { pregnancy_status: "Delivered" }
            });

            return tx.delivery_Outcome.findUnique({
                where: { delivery_id: deliveryOutcome.delivery_id },
                include: {
                    newbornRecords: true,
                    postpartumVisits: true
                }
            });
        });

        return res.status(200).json({
            message: "Delivery outcome successfully registered",
            data: result
        });

    } catch (error) {
        return next(error);
    }
};

const updateDeliveryOutcome = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;
        const { strategy, version, ...clientData } = req.body;

        if (!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        const mvccResult = await updateWithMVCC('delivery_Outcome', delivery_id, { version, ...clientData }, {
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
            message: "Delivery outcome updated successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteDeliveryOutcome = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        if (!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        await prisma.delivery_Outcome.delete({
            where: { delivery_id: delivery_id }
        });

        return res.status(200).json({
            message: "Delivery outcome deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
};

const getDeliveryOutcomeById = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        const delivery = await prisma.delivery_Outcome.findUnique({
            where: { delivery_id },
            include: {
                newbornRecords: true,
                postpartumVisits: true
            }
        });

        if (!delivery) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        return res.status(200).json({
            message: "Delivery outcome fetched successfully",
            data: delivery
        });

    } catch (error) {
        return next(error);
    }
};

const getDeliveryOutcomeByPregnancy = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        if (!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy not found" });
        }

        const deliveryOutcomes = await prisma.delivery_Outcome.findMany({
            where: { pregnancy_id: pregnancy_id },
            include: {
                newbornRecords: true,
                postpartumVisits: true
            },
            orderBy: { delivery_date: 'desc' }
        });

        return res.status(200).json({
            message: "Delivery outcomes successfully retrieved",
            data: deliveryOutcomes
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerDeliveryOutcome,
    updateDeliveryOutcome,
    deleteDeliveryOutcome,
    getDeliveryOutcomeById,
    getDeliveryOutcomeByPregnancy
};
