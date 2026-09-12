const prisma = require('../util/db');
const validate = require('../util/validation');
const { evaluate_clinical_vitals } = require('../services/cdssRiskServices');
const { updateWithMVCC } = require('../services/conflicResolution');

const evaluateVisitRisk = async (req, res, next) => {
    try {
        const { visit_id } = req.params;

        if (!visit_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isPrenatalVisitExist(visit_id))) {
            return res.status(404).json({ error: "Prenatal Visit Doesn't Exist!" });
        }

        const result = await evaluate_clinical_vitals(visit_id);

        return res.status(200).json({
            message: "CDSS Risk Assessment Evaluated Successfully",
            data: result,
        });

    } catch (error) {
        return next(error);
    }
};

const getAlertsByPregnancy = async (req, res, next) => {
    try {
        const { pregnancy_id } = req.params;

        if (!pregnancy_id) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({ error: "Pregnancy Record Doesn't Exist" });
        }

        const alerts = await prisma.cDSS_Alert.findMany({
            where: { pregnancy_id: pregnancy_id },
            include: {
                visit: true,
                pregnancy: {
                    include: {
                        mother: true,
                    },
                },
            },
            orderBy: { alert_id: 'desc' },
        });

        return res.status(200).json({
            message: "CDSS Alerts Retrieved Successfully",
            data: alerts,
        });

    } catch (error) {
        return next(error);
    }
};

const resolveAlert = async (req, res, next) => {
    try {
        const { alert_id } = req.params;
        const { resolved_by, strategy, version } = req.body;

        if (!alert_id || !resolved_by) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isCDSSAlertExist(alert_id))) {
            return res.status(404).json({ error: "CDSS Alert Doesn't Exist!" });
        }

        const mvccResult = await updateWithMVCC('cDSS_Alert', alert_id, {
            version,
            is_resolved: true,
            resolved_by: resolved_by,
            resolved_at: new Date()
        }, {
            strategy,
            userId: resolved_by
        });

        if (!mvccResult.resolved) {
            return res.status(409).json({
                error: "Conflict detected requiring manual review",
                details: mvccResult
            });
        }

        return res.status(200).json({
            message: "CDSS Alert Resolved Successfully",
            data: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const getHighRiskProfilesByFacility = async (req, res, next) => {
    try {
        const facility_id = req.params.facility_id || req.user?.facility_id;

        // Fetch high-risk alerts (severity HIGH / CRITICAL)
        const highRiskAlerts = await prisma.cDSS_Alert.findMany({
            where: {
                is_resolved: false,
                OR: [
                    { severity: { in: ['HIGH', 'High', 'High Risk', 'CRITICAL', 'CRITICAL_RISK'] } },
                    { alert_type: 'CRITICAL_RISK' }
                ],
                ...(facility_id ? {
                    pregnancy: {
                        mother: {
                            user: {
                                facility_id: facility_id
                            }
                        }
                    }
                } : {})
            },
            include: {
                pregnancy: {
                    include: {
                        mother: {
                            include: { user: true }
                        }
                    }
                }
            }
        });

        // Also fetch visits explicitly assessed as HIGH risk
        const highRiskVisits = await prisma.prenatalVisit.findMany({
            where: {
                risk_level_assessed: { in: ['HIGH', 'High', 'High Risk'] },
                ...(facility_id ? {
                    pregnancy: {
                        mother: {
                            user: {
                                facility_id: facility_id
                            }
                        }
                    }
                } : {})
            },
            select: { pregnancy_id: true }
        });

        // Deduplicate unique high risk mother/pregnancy profiles
        const highRiskMotherIds = new Set();
        highRiskAlerts.forEach(alert => {
            if (alert.pregnancy?.mother_id) {
                highRiskMotherIds.add(alert.pregnancy.mother_id);
            } else if (alert.pregnancy_id) {
                highRiskMotherIds.add(alert.pregnancy_id);
            }
        });
        highRiskVisits.forEach(visit => {
            if (visit.pregnancy_id) {
                highRiskMotherIds.add(visit.pregnancy_id);
            }
        });

        return res.status(200).json({
            message: "High risk profiles retrieved successfully",
            count: highRiskMotherIds.size,
            data: highRiskAlerts
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    evaluateVisitRisk,
    getAlertsByPregnancy,
    resolveAlert,
    getHighRiskProfilesByFacility,
};