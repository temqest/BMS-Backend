const prisma = require('../../util/db');
const validate = require('../../util/validation');
const { updateWithMVCC } = require('../../services/conflicResolution');
const { logAuditTrail } = require('../../services/auditService');
const { resolveEntityId } = require('../../middleware/idResolver');

const registerPregnancy = async (req, res, next) => {
    try {
        const {
            motherId,
            lmp_date, 
            edd_date,
            gravida, 
            parity, 
            previous_delivery_history,
            co_morbidities,
            age_group,
            height_cm,
            bmi_1st_trimester,
            bmi_category,
            pregnancy_status,
            deworming_given,
            deworming_date,
            completed_8anc,
            prev_caesarean,
            consecutive_miscarriages,
            stillbirth_history,
            pph_history,
            has_tb,
            has_heart_disease,
            has_diabetes,
            has_asthma,
            has_goiter
        } = req.body;

        let targetMotherId = motherId || req.body.mother_id;

        const isNullOrUndefined = (val) => val === undefined || val === null || (typeof val === 'string' && val.trim() === '');

        if (!targetMotherId || isNullOrUndefined(gravida) || isNullOrUndefined(parity) || !age_group || !lmp_date || !pregnancy_status) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const motherRecord = await prisma.mother.findFirst({
            where: { OR: [{ mother_id: targetMotherId }, { user_id: targetMotherId }] }
        });

        if (motherRecord) {
            targetMotherId = motherRecord.mother_id;
        } else {
            return res.status(404).json({ error: "Mother not found" });
        }

        const today = new Date();
        const Lmp_Date = new Date(lmp_date);

        if (Lmp_Date > today) {
            return res.status(400).json({ error: "LMP date cannot be in the future" });
        }

        const existingPreg = await prisma.pregnancy.findFirst({
            where: {
                mother_id: targetMotherId,
                lmp_date: Lmp_Date,
            }
        });

        if (existingPreg) {
            return res.status(200).json({
                message: "Pregnancy already registered",
                pregnancy: existingPreg,
            });
        }

        const parsedEddDate = edd_date ? new Date(edd_date) : new Date(Lmp_Date.getTime() + 280 * 24 * 60 * 60 * 1000);
        const parsedHeightCm = (height_cm !== undefined && height_cm !== null && height_cm !== '') ? parseFloat(height_cm) : null;
        const parsedBmi = (bmi_1st_trimester !== undefined && bmi_1st_trimester !== null && bmi_1st_trimester !== '') ? parseFloat(bmi_1st_trimester) : null;

        const pregnancy = await prisma.pregnancy.create({
            data: {
                mother_id: targetMotherId,
                date_of_registration: today,
                lmp_date: Lmp_Date,
                edd_date: parsedEddDate,
                gravida: Number(gravida),
                parity: Number(parity),
                previous_delivery_history: previous_delivery_history || null,
                co_morbidities: co_morbidities || null,
                age_group,
                height_cm: parsedHeightCm,
                bmi_1st_trimester: parsedBmi,
                bmi_category: bmi_category || null,
                pregnancy_status,
                deworming_given: Boolean(deworming_given),
                deworming_date: deworming_date ? new Date(deworming_date) : null,
                completed_8anc: Boolean(completed_8anc),
                prev_caesarean: Boolean(prev_caesarean),
                consecutive_miscarriages: Boolean(consecutive_miscarriages),
                stillbirth_history: Boolean(stillbirth_history),
                pph_history: Boolean(pph_history),
                has_tb: Boolean(has_tb),
                has_heart_disease: Boolean(has_heart_disease),
                has_diabetes: Boolean(has_diabetes),
                has_asthma: Boolean(has_asthma),
                has_goiter: Boolean(has_goiter),
                sync_status: "synced",
            }
        });

        await logAuditTrail({
            userId: req.user?.user_id || req.user?.id || motherId,
            tableName: 'pregnancy',
            actionType: 'CREATE',
            newState: pregnancy
        });

        return res.status(201).json({
            message: "Pregnancy registered successfully",
            pregnancy: pregnancy,
        });

    } catch (error) {
        return next(error);
    }
};

const updatePregnancy = async (req, res, next) => {
    let { pregnancy_id } = req.params;
    const { strategy, version, ...clientData } = req.body;

    try {
        const { resolvedId, record } = await resolveEntityId('pregnancy', pregnancy_id, req.body);

        if (resolvedId && record) {
            pregnancy_id = resolvedId;
        }

        const formattedData = { ...clientData };
        if (formattedData.edd_date !== undefined) {
            formattedData.edd_date = formattedData.edd_date ? new Date(formattedData.edd_date) : null;
        }
        if (formattedData.lmp_date !== undefined) {
            formattedData.lmp_date = formattedData.lmp_date ? new Date(formattedData.lmp_date) : null;
        }
        if (formattedData.deworming_date !== undefined) {
            formattedData.deworming_date = formattedData.deworming_date ? new Date(formattedData.deworming_date) : null;
        }
        if (formattedData.height_cm !== undefined) {
            formattedData.height_cm = (formattedData.height_cm !== null && formattedData.height_cm !== '') ? parseFloat(formattedData.height_cm) : null;
        }
        if (formattedData.bmi_1st_trimester !== undefined) {
            formattedData.bmi_1st_trimester = (formattedData.bmi_1st_trimester !== null && formattedData.bmi_1st_trimester !== '') ? parseFloat(formattedData.bmi_1st_trimester) : null;
        }
        const booleanFields = [
            'deworming_given',
            'completed_8anc',
            'prev_caesarean',
            'consecutive_miscarriages',
            'stillbirth_history',
            'pph_history',
            'has_tb',
            'has_heart_disease',
            'has_diabetes',
            'has_asthma',
            'has_goiter'
        ];
        for (const field of booleanFields) {
            if (formattedData[field] !== undefined) {
                formattedData[field] = Boolean(formattedData[field]);
            }
        }

        const mvccResult = await updateWithMVCC('pregnancy', pregnancy_id, { version, ...formattedData }, {
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
            message: "Pregnancy updated successfully",
            pregnancy: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed,
        });

    } catch (error) {
        return next(error);
    }
};

const deletePregnancy = async (req, res, next) => {
    let { pregnancy_id } = req.params;

    try {
        const { resolvedId, record: existing } = await resolveEntityId('pregnancy', pregnancy_id, {
            ...(req.query || {}),
            ...(req.body || {})
        });

        if (!resolvedId || !existing) {
            return res.status(200).json({
                message: "Pregnancy already deleted or not found",
                pregnancy_id
            });
        }

        pregnancy_id = resolvedId;

        try {
            await prisma.prenatalVisit.deleteMany({ where: { pregnancy_id } });
            await prisma.supplementation_Record.deleteMany({ where: { pregnancy_id } });
            await prisma.lab_Screening.deleteMany({ where: { pregnancy_id } });
            await prisma.cDSS_Alert.deleteMany({ where: { pregnancy_id } });
            await prisma.online_Referral.deleteMany({ where: { pregnancy_id } });
            await prisma.delivery_Outcome.deleteMany({ where: { pregnancy_id } });
        } catch (cascadeErr) {
            console.warn("[deletePregnancy] Child record cleanup warning:", cascadeErr.message);
        }

        const pregnancy = await prisma.pregnancy.delete({
            where: { pregnancy_id: pregnancy_id },
        });

        await logAuditTrail({
            userId: req.user?.user_id || req.user?.id || 'system',
            tableName: 'pregnancy',
            actionType: 'DELETE',
            previousState: existing
        });

        return res.status(200).json({
            message: "Pregnancy deleted successfully",
            pregnancy: pregnancy,
        });

    } catch (error) {
        return next(error);
    }
};

const getPregnancyByID = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        if (!pregnancy_id) {
            return res.status(400).json({ error: "Pregnancy ID is required" });
        }

        const pregnancy = await prisma.pregnancy.findUnique({
            where: { pregnancy_id: pregnancy_id },
            include: {
                prenatalVisits: {
                    orderBy: { visit_date: 'asc' },
                    include: {
                        healthWorker: {
                            select: {
                                user_id: true,
                                first_name: true,
                                middle_name: true,
                                last_name: true,
                                role: true,
                                facility: true,
                            },
                        },
                    },
                },
            },
        });

        if (!pregnancy) {
            return res.status(404).json({ error: "Pregnancy not found" });
        }

        return res.status(200).json({
            message: "Pregnancy data retrieved successfully",
            pregnancy: pregnancy,
        });

    } catch (error) {
        return next(error);
    }
};

const getAllPreganciesByMother = async (req, res, next) => {
    try {
        const { mother_id } = req.params;

        if (!mother_id) {
            return res.status(400).json({ error: "Mother ID is required" });
        }

        const mother = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            }
        });

        if (!mother) {
            return res.status(404).json({ error: "Mother not found" });
        }

        const pregnancy = await prisma.pregnancy.findMany({
            where: { mother_id: mother.mother_id },
            orderBy: { date_of_registration: "desc" }
        });

        return res.status(200).json({
            message: "Pregnancies retrieved successfully",
            pregnancy: pregnancy,
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerPregnancy,
    updatePregnancy,
    deletePregnancy,
    getPregnancyByID,
    getAllPreganciesByMother,
};
