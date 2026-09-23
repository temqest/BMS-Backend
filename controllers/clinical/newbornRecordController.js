const prisma = require('../../util/db');
const validate = require('../../util/validation');
const { updateWithMVCC } = require('../../services/conflicResolution');

const registerNewbornRecord = async (req, res, next) => {
    try {
        const { delivery_id, sex, birth_weight_kg, status_at_birth, apgar_score } = req.body;

        if (!delivery_id || !sex || !birth_weight_kg || !status_at_birth || apgar_score === undefined) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        if (!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        const newbornRecord = await prisma.newborn_Record.create({
            data: {
                delivery_id,
                sex,
                birth_weight_kg,
                status_at_birth,
                apgar_score,
                sync_status: "synced"
            }
        });

        return res.status(200).json({
            message: "Newborn record successfully registered",
            data: newbornRecord
        });

    } catch (error) {
        return next(error);
    }
};

const updateNewbornRecord = async (req, res, next) => {
    try {
        const { newborn_id } = req.params;
        const { strategy, version, ...clientData } = req.body;

        if (!(await validate.isNewbornExist(newborn_id))) {
            return res.status(404).json({ error: "Newborn record not found" });
        }

        const mvccResult = await updateWithMVCC('newborn_Record', newborn_id, { version, ...clientData }, {
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
            message: "Newborn record updated successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteNewbornRecord = async (req, res, next) => {
    try {
        const { newborn_id } = req.params;

        if (!(await validate.isNewbornExist(newborn_id))) {
            return res.status(404).json({ error: "Newborn record not found" });
        }

        await prisma.newborn_Record.delete({
            where: { newborn_id: newborn_id }
        });

        return res.status(200).json({
            message: "Newborn record deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
};

const getNewbornRecordById = async (req, res, next) => {
    try {
        const { newborn_id } = req.params;

        const isNewbornExist = await validate.isNewbornExist(newborn_id);

        if (!isNewbornExist) {
            return res.status(404).json({ error: "Newborn record not found" });
        }

        return res.status(200).json({
            message: "Newborn record fetched successfully",
            data: isNewbornExist
        });

    } catch (error) {
        return next(error);
    }
};

const getNewbornRecordByDelivery = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        if (!(await validate.isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({ error: "Delivery outcome not found" });
        }

        const newbornRecords = await prisma.newborn_Record.findMany({
            where: { delivery_id: delivery_id }
        });

        return res.status(200).json({
            message: "Newborn records successfully retrieved",
            data: newbornRecords
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerNewbornRecord,
    updateNewbornRecord,
    deleteNewbornRecord,
    getNewbornRecordById,
    getNewbornRecordByDelivery
};
