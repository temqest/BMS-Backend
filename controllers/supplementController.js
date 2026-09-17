const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');
const { resolveEntityId } = require('../middleware/idResolver');

const registerSupplementRecord = async (req, res, next) => {
    try {
        const { pregnancy_id, supplement_type, date_given, tablets_given_count, visit_id } = req.body;

        if (!pregnancy_id || !supplement_type || !date_given || !tablets_given_count || !visit_id) {
            return res.status(400).json({ error: "Required fields are missing" });
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
            return res.status(404).json({ error: "Pregnancy not found" });
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
                return res.status(400).json({ 
                    error: "A valid prenatal visit must be recorded before registering supplements for this pregnancy." 
                });
            }
        }

        const existingRecord = await prisma.supplementation_Record.findFirst({
            where: {
                pregnancy_id: targetPregnancyId,
                visit_id: targetVisitId,
                supplement_type: supplement_type,
                date_given: new Date(date_given),
            }
        });

        if (existingRecord) {
            return res.status(200).json({
                message: "Supplement Record already exists",
                supplement_record: existingRecord,
                data: existingRecord,
            });
        }

        const newSupplementRecord = await prisma.supplementation_Record.create({
            data: {
                pregnancy_id: targetPregnancyId,
                supplement_type: supplement_type,
                date_given: date_given,
                tablets_given_count: tablets_given_count,
                visit_id: targetVisitId
            }
        });

        return res.status(200).json({
            message: "Supplement record created successfully",
            supplement_record: newSupplementRecord,
            data: newSupplementRecord,
        });

    } catch (error) {
        return next(error);
    }
};

const updateSupplementRecord = async (req, res, next) => {
    try {
        const { supplement_id, strategy, version, ...clientData } = req.body;
        let targetId = supplement_id || req.params.supplement_id;

        if (!targetId) {
            return res.status(400).json({ error: "Supplement ID is required" });
        }

        const { resolvedId, record } = await resolveEntityId('supplementation_Record', targetId, req.body);

        if (!resolvedId || !record) {
            return res.status(404).json({ error: "Supplement record not found" });
        }

        targetId = resolvedId;

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
            message: "Supplement record updated successfully",
            supplement_record: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteSupplementRecord = async (req, res, next) => {
    try {
        let { supplement_id } = req.params;

        const { resolvedId, record } = await resolveEntityId('supplementation_Record', supplement_id, req.query || req.body);

        if (!resolvedId || !record) {
            return res.status(200).json({ message: "Supplement record already deleted" });
        }

        supplement_id = resolvedId;

        await prisma.supplementation_Record.delete({
            where: { supplement_id: supplement_id }
        });

        return res.status(200).json({
            message: "Supplement record deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
};

const getSupplementRecordByID = async (req, res, next) => {
    try {
        const { supplement_id } = req.params;

        const supplement_record = await prisma.supplementation_Record.findUnique({
            where: { supplement_id: supplement_id }
        });

        if (!supplement_record) {
            return res.status(404).json({ error: "Supplement record not found" });
        }

        return res.status(200).json({
            message: "Supplement record found",
            supplement_record: supplement_record
        });

    } catch (error) {
        return next(error);
    }
};

const getSupplementRecordByPregnancy = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        if (!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy not found" });
        }

        const supplement_records = await prisma.supplementation_Record.findMany({
            where: { pregnancy_id: pregnancy_id }
        });

        return res.status(200).json({
            message: "Supplement records found",
            supplement_records: supplement_records
        });

    } catch (error) {
        return next(error);
    }
};

const getSupplementRecordByHealthWorker = async (req, res, next) => {
    try {
        const { health_worker_id } = req.params;

        if (!(await validate.isUserExist(health_worker_id))) {
            return res.status(404).json({ error: "Health worker not found" });
        }

        const supplement_records = await prisma.supplementation_Record.findMany({
            where: {
                visit: {
                    health_worker_id: health_worker_id
                }
            }
        });

        return res.status(200).json({
            message: "Supplement records found",
            supplement_records: supplement_records
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
            return res.status(404).json({ error: "Mother record not found" });
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
            message: "Supplement records found",
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