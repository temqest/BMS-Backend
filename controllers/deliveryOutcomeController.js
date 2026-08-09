const prisma = require('../util/db');

const registerDeliveryOutcome = async (req, res, next) => {
    try {
        const { pregnancy_id, delivery_date, place_of_delivery, mode_of_delivery, duration_of_labor_hours, blood_loss_ml, delivery_complications } = req.body;

        if (!pregnancy_id || !place_of_delivery || !mode_of_delivery) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        const existingPregnancy = await prisma.pregnancy.findUnique({
            where: { pregnancy_id: pregnancy_id }
        });

        if (!existingPregnancy) {
            return res.status(400).json({ error: "Pregnancy Not Found!" });
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
        const { place_of_delivery, mode_of_delivery, delivery_date, duration_of_labor_hours, blood_loss_ml, delivery_complications } = req.body;

        const isDeliveryExist = await prisma.delivery_Outcome.findUnique({
            where: { delivery_id: delivery_id }
        });

        if (!isDeliveryExist) {
            return res.status(400).json({ error: "Delivery Outcome Not Found!" });
        }

        if (!place_of_delivery || !mode_of_delivery) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        const updatedDeliveryOutcome = await prisma.delivery_Outcome.update({
            where: { delivery_id: delivery_id },
            data: {
                place_of_delivery,
                mode_of_delivery,
                delivery_date: delivery_date ? new Date(delivery_date) : undefined,
                duration_of_labor_hours,
                blood_loss_ml,
                delivery_complications
            }
        });

        return res.status(200).json({
            message: "Delivery Outcome Updated Successfully!",
            data: updatedDeliveryOutcome
        });
    } catch (error) {
        return next(error);
    }
};

const deleteDeliveryOutcome = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        const isDeliveryExist = await prisma.delivery_Outcome.findUnique({
            where: { delivery_id: delivery_id }
        });

        if (!isDeliveryExist) {
            return res.status(400).json({ error: "Delivery Outcome Not Found!" });
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

        const isDeliveryExist = await prisma.delivery_Outcome.findUnique({
            where: { delivery_id: delivery_id }
        });

        if (!isDeliveryExist) {
            return res.status(400).json({ error: "Delivery Outcome Not Found!" });
        }

        return res.status(200).json({
            message: "Delivery Outcome Fetched Successfully!",
            data: isDeliveryExist
        });
    } catch (error) {
        return next(error);
    }
};

const getDeliveryOutcomeByPregnancy = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        const isPregnancyExist = await prisma.pregnancy.findUnique({
            where: { pregnancy_id: pregnancy_id }
        });

        if (!isPregnancyExist) {
            return res.status(400).json({ error: "Pregnancy Not Found!" });
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
