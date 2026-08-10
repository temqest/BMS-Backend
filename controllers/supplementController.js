const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const registerSupplementRecord = async (req, res, next) => {
    try {
        const {pregnancy_id, supplement_type, date_given, tablets_given_count, visit_id} = req.body;

        if (!pregnancy_id || !supplement_type || !date_given || !tablets_given_count || !visit_id) {
            return res.status(400).json({error : "Missing Required Fields"});
        }

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy ID doesn't Exist"});
        }

        const newSupplementRecord = await prisma.supplementation_Record.create({
            data : {
                pregnancy_id : pregnancy_id,
                supplement_type : supplement_type,
                date_given : date_given,
                tablets_given_count : tablets_given_count,
                visit_id : visit_id
            }
        });

        return res.status(200).json({
            message : "Supplement Record Successfully Created",
            supplement_record : newSupplementRecord
        });

    } catch (error) {
        return next(error);
    }
};

const updateSupplementRecord = async (req, res, next) => {
    try {
        const { supplement_id, strategy, version, ...clientData } = req.body;
        const targetId = supplement_id || req.params.supplement_id;

        if (!targetId) {
            return res.status(400).json({error : "Missing Required Fields"});
        }

        if(!(await validate.isSupplementRecordExist(targetId))) {
            return res.status(404).json({error: "Supplement Record doesn't Exist"});
        }

        const mvccResult = await updateWithMVCC('supplementation_Record', targetId, { version, ...clientData }, {
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
            message : "Supplement Record Successfully Updated",
            supplement_record : mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteSupplementRecord = async (req, res, next) => {
    try {
        const {supplement_id} = req.params;

        if(!(await validate.isSupplementRecordExist(supplement_id))) {
            return res.status(404).json({error: "Supplement Record Not Found!"});
        }

        await prisma.supplementation_Record.delete({
            where : {supplement_id : supplement_id}
        });

        return res.status(200).json({
            message : "Supplement Record Successfully Deleted"
        });

    } catch (error) {
        return next(error);
    }
};

const getSupplementRecordByID = async (req, res, next) => {
    try {
        const {supplement_id} = req.params;

        const supplement_record = await prisma.supplementation_Record.findUnique({
            where : {supplement_id : supplement_id}
        });

        if(!supplement_record) {
            return res.status(404).json({error: "Supplement Record Doesn't Exist!"});
        }

        return res.status(200).json({
            message : "Supplement Record Found!",
            supplement_record : supplement_record
        });

    } catch (error) {
        return next(error);
    }
};

const getSupplementRecordByPregnancy = async (req, res, next) => {
    try {
        const {pregnancy_id} = req.params;

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy doesn't Exist!"});
        }

        const supplement_records = await prisma.supplementation_Record.findMany({
            where : {pregnancy_id : pregnancy_id}
        });

        return res.status(200).json({
            message : "Supplement Records Found!",
            supplement_records : supplement_records
        });

    } catch (error) {
        return next(error);
    }
};

const getSupplementRecordByHealthWorker = async (req, res, next) => {
    try {
        const {health_worker_id} = req.params;

        if(!(await validate.isUserExist(health_worker_id))) {
            return res.status(404).json({error: "Health Worker doesn't Exist!"});
        }

        const supplement_records = await prisma.supplementation_Record.findMany({
            where : {
                visit: {
                    health_worker_id : health_worker_id
                }
            }
        });

        return res.status(200).json({
            message : "Supplement Records Found!",
            supplement_records : supplement_records
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerSupplementRecord,
    updateSupplementRecord,
    deleteSupplementRecord,
    getSupplementRecordByID,
    getSupplementRecordByPregnancy,
    getSupplementRecordByHealthWorker
};