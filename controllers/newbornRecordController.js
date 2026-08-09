const prisma = require('../util/db');
const { isUserExist, isMotherExist, isPregnancyExist, isFacilityExist, isPrenatalVisitExist, isDeliveryOutcomeExist, isNewbornExist, isPostpartumVisitExist, isLabScreeningExist, isImmunizationRecordExist, isSupplementRecordExist, isNotificationExist } = require('../util/validation');


const registerNewbornRecord = async (req, res, next) => {
    try {
        const { delivery_id, sex, birth_weight_kg, status_at_birth, apgar_score } = req.body;

        if (!delivery_id || !sex || !birth_weight_kg || !status_at_birth || apgar_score === undefined) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        if(!(await isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({error: "Delivery Outcome Not Found!"});
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
            message: "Newborn Record Successfully Registered!",
            data: newbornRecord
        });
    } catch (error) {
        return next(error);
    }
};

const updateNewbornRecord = async (req, res, next) => {
    try {
        const { newborn_id } = req.params;
        const { sex, birth_weight_kg, status_at_birth, apgar_score } = req.body;

        if(!(await isNewbornExist(newborn_id))) {
            return res.status(404).json({error: "Newborn Record Not Found!"});
        }

        if (!sex || !birth_weight_kg || !status_at_birth || apgar_score === undefined) {
            return res.status(400).json({ error: "Missing Required Fields" });
        }

        const updatedNewbornRecord = await prisma.newborn_Record.update({
            where: { newborn_id: newborn_id },
            data: {
                sex,
                birth_weight_kg,
                status_at_birth,
                apgar_score
            }
        });

        return res.status(200).json({
            message: "Newborn Record Updated Successfully!",
            data: updatedNewbornRecord
        });
    } catch (error) {
        return next(error);
    }
};

const deleteNewbornRecord = async (req, res, next) => {
    try {
        const { newborn_id } = req.params;

        if(!(await isNewbornExist(newborn_id))) {
            return res.status(404).json({error: "Newborn Record Not Found!"});
        }

        await prisma.newborn_Record.delete({
            where: { newborn_id: newborn_id }
        });

        return res.status(200).json({
            message: "Newborn Record Deleted Successfully!"
        });
    } catch (error) {
        return next(error);
    }
};

const getNewbornRecordById = async (req, res, next) => {
    try {
        const { newborn_id } = req.params;

        if(!(await isNewbornExist(newborn_id))) {
            return res.status(404).json({error: "Newborn Record Not Found!"});
        }

        return res.status(200).json({
            message: "Newborn Record Fetched Successfully!",
            data: isNewbornExist
        });
    } catch (error) {
        return next(error);
    }
};

const getNewbornRecordByDelivery = async (req, res, next) => {
    try {
        const { delivery_id } = req.params;

        if(!(await isDeliveryOutcomeExist(delivery_id))) {
            return res.status(404).json({error: "Delivery Outcome Not Found!"});
        }

        const newbornRecords = await prisma.newborn_Record.findMany({
            where: { delivery_id: delivery_id }
        });

        return res.status(200).json({
            message: "Newborn Records Successfully Retrieved",
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
