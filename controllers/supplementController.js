const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const registerSupplementRecord = async (req, res, next) => {
    try {
        const {pregnancy_id, supplement_type, date_given, tablets_given_count, visit_id} = req.body;

        if (!pregnancy_id || !supplement_type || !date_given || !tablets_given_count || !visit_id) {
            return res.status(400).json({error : "Missing Required Fields"});
        }

        let targetPregnancyId = pregnancy_id;
        let pregnancy = await prisma.pregnancy.findUnique({
            where: { pregnancy_id: pregnancy_id }
        });

        if (!pregnancy && req.body.mother_id) {
            const motherRecord = await prisma.mother.findFirst({
                where: { OR: [{ mother_id: req.body.mother_id }, { user_id: req.body.mother_id }] }
            });
            if (motherRecord) {
                pregnancy = await prisma.pregnancy.findFirst({
                    where: { mother_id: motherRecord.mother_id },
                    orderBy: { date_of_registration: "desc" }
                });
            }
        }

        if (!pregnancy) {
            return res.status(404).json({ error: "Pregnancy ID doesn't Exist" });
        }
        targetPregnancyId = pregnancy.pregnancy_id;

        let targetVisitId = visit_id;
        let visitExists = visit_id ? await prisma.prenatalVisit.findUnique({ where: { visit_id: visit_id } }) : null;

        if (!visitExists) {
            const latestVisit = await prisma.prenatalVisit.findFirst({
                where: { pregnancy_id: targetPregnancyId },
                orderBy: { visit_date: "desc" }
            });
            if (latestVisit) {
                targetVisitId = latestVisit.visit_id;
            } else {
                const defaultHealthWorker = req.user?.user_id || (await prisma.user.findFirst({ where: { is_active: true } }))?.user_id || "system";
                const createdVisit = await prisma.prenatalVisit.create({
                    data: {
                        pregnancy_id: targetPregnancyId,
                        health_worker_id: defaultHealthWorker,
                        trimester: 1,
                        visit_number: 1,
                        age_of_gestation_weeks: 12,
                        weight_kg: 50,
                        temperature_celsius: 36.5,
                        pulse_rate_bpm: 75,
                        bp_systolic: 120,
                        bp_diastolic: 80,
                        sync_status: "synced",
                    }
                });
                targetVisitId = createdVisit.visit_id;
            }
        }

        const newSupplementRecord = await prisma.supplementation_Record.create({
            data : {
                pregnancy_id : targetPregnancyId,
                supplement_type : supplement_type,
                date_given : date_given,
                tablets_given_count : tablets_given_count,
                visit_id : targetVisitId
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

const getSupplementRecordByMother = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            }
        });

        if (!motherRecord) {
            return res.status(404).json({ error: "Mother doesn't exist" });
        }

        const pregnancies = await prisma.pregnancy.findMany({
            where: { mother_id: motherRecord.mother_id },
            select: { pregnancy_id: true }
        });

        if (!pregnancies || pregnancies.length === 0) {
            return res.status(200).json({
                message: "No pregnancies found",
                data: []
            });
        }

        const pregnancyIds = pregnancies.map(p => p.pregnancy_id);

        const supplement_records = await prisma.supplementation_Record.findMany({
            where: {
                pregnancy_id: { in: pregnancyIds }
            },
            orderBy: {
                date_given: 'desc'
            }
        });

        return res.status(200).json({
            message: "Supplement Records Found!",
            data: supplement_records
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
    getSupplementRecordByHealthWorker,
    getSupplementRecordByMother
};