const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const registerDeliveryOutcome = async (req, res, next) => {
    try {
        const { pregnancy_id, delivery_date, place_of_delivery, mode_of_delivery, duration_of_labor_hours, blood_loss_ml, delivery_complications } = req.body;

        if (!pregnancy_id || !place_of_delivery || !mode_of_delivery) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy Not Found!"});
        }

        const deliveryOutcome = await prisma.delivery_Outcome.create({
            data: {
                pregnancy_id,
                delivery_date: delivery_date ? new Date(delivery_date) : undefined,
                place_of_delivery,
                mode_of_delivery,
                duration_of_labor_hours,
                blood_loss_ml,
                delivery_complications,
                sync_status: "synced"
            }
        });

        return res.status(200).json({
            message: "Delivery Outcome Successfully Registered!",
            data: deliveryOutcome
        });
    } catch (error) {
        return next(error);
    }
};

const updateDeliveryOutcome = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;
        const { strategy, version, ...clientData } = req.body;

        if(!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({error: "Delivery Outcome Not Found!"});
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
            message: "Delivery Outcome Updated Successfully!",
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

        if(!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({error: "Delivery Outcome Not Found!"});
        }

        await prisma.delivery_Outcome.delete({
            where: { delivery_id: delivery_id }
        });

        return res.status(200).json({
            message: "Delivery Outcome Deleted Successfully!"
        });
    } catch (error) {
        return next(error);
    }
};

const getDeliveryOutcomeById = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        const deliveryExist = await validate.isDeliveryOutcomeExist(delivery_id);
        if(!deliveryExist) {
            return res.status(404).json({error: "Delivery Outcome Not Found!"});
        }

        return res.status(200).json({
            message: "Delivery Outcome Fetched Successfully!",
            data: deliveryExist
        });
    } catch (error) {
        return next(error);
    }
};

const getDeliveryOutcomeByPregnancy = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy Not Found!"});
        }

        const deliveryOutcomes = await prisma.delivery_Outcome.findMany({
            where: { pregnancy_id: pregnancy_id }
        });

        return res.status(200).json({
            message: "Delivery Outcomes Successfully Retrieved",
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
