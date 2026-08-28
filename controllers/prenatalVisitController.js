const prisma = require('../util/db');
const validate = require('../util/validation');
const { evaluate_clinical_vitals } = require('../services/cdssRiskServices');
const { updateWithMVCC } = require('../services/conflicResolution');
const { logAuditTrail } = require('../services/auditService');

const registerPrenatalVisit = async (req, res, next) => {
    
    try {

        const {
            pregnancy_id,
            health_worker_id,
            trimester,
            visit_number,
            age_of_gestation_weeks,
            weight_kg,
            temperature_celsius,
            pulse_rate_bpm,
            bp_diastolic,
            bp_systolic,
            fundic_height_cm,
            fetal_heart_tone_bpm,
            chief_complaint,
            danger_signs_observed,
            risk_level_assessed,
        } = req.body;

        if(
            !pregnancy_id ||
            !health_worker_id ||
            !trimester ||
            !visit_number ||
            !age_of_gestation_weeks ||
            !weight_kg ||
            !temperature_celsius ||
            !pulse_rate_bpm ||
            !bp_diastolic ||
            !bp_systolic
        ) {
            return res.status(400).json({error: "Missing Required Fields"});
        }

        const vitalsValidationErrors = validate.validateClinicalVitals(req.body);
        if (vitalsValidationErrors.length > 0) {
            return res.status(400).json({ error: "Invalid Medical Data", details: vitalsValidationErrors });
        }

        let targetPregnancyId = pregnancy_id;
        let pregnancy = await prisma.pregnancy.findUnique({
            where : {pregnancy_id : pregnancy_id}
        });

        if (!pregnancy && req.body.mother_id) {
            const motherRecord = await prisma.mother.findFirst({
                where: { OR: [{ mother_id: req.body.mother_id }, { user_id: req.body.mother_id }] }
            });
            if (motherRecord) {
                pregnancy = await prisma.pregnancy.findFirst({
                    where: { mother_id: motherRecord.mother_id, pregnancy_status: "Active" },
                    orderBy: { date_of_registration: "desc" }
                }) || await prisma.pregnancy.findFirst({
                    where: { mother_id: motherRecord.mother_id },
                    orderBy: { date_of_registration: "desc" }
                });
            }
        }

        if(!pregnancy) {
            return res.status(404).json({error: "Pregnancy Not Found!"});
        }
        targetPregnancyId = pregnancy.pregnancy_id;

        let healthWorkerIdToUse = health_worker_id;
        let health_worker = health_worker_id
            ? await prisma.user.findUnique({ where: { user_id: health_worker_id } })
            : null;

        if (!health_worker) {
            const fallbackUser = req.user?.user_id
                ? await prisma.user.findUnique({ where: { user_id: req.user.user_id } })
                : await prisma.user.findFirst({ where: { is_active: true } });

            if (fallbackUser) {
                health_worker = fallbackUser;
                healthWorkerIdToUse = fallbackUser.user_id;
            } else {
                return res.status(404).json({ error: "Health Worker Not Found!" });
            }
        }

        const newPrenatalVisit = await prisma.prenatalVisit.create({
            data: {
                pregnancy_id: targetPregnancyId,
                health_worker_id: healthWorkerIdToUse,
                trimester : trimester,
                visit_number : visit_number,
                age_of_gestation_weeks : age_of_gestation_weeks,
                weight_kg : weight_kg,
                temperature_celsius : temperature_celsius,
                pulse_rate_bpm : pulse_rate_bpm,
                bp_diastolic : bp_diastolic,
                bp_systolic : bp_systolic,
                fundic_height_cm : fundic_height_cm,
                fetal_heart_tone_bpm : fetal_heart_tone_bpm,
                chief_complaint : chief_complaint,
                danger_signs_observed : danger_signs_observed,
                risk_level_assessed : risk_level_assessed,
                sync_status : "synced",
            }
        });

        const cdssAssessment = await evaluate_clinical_vitals(newPrenatalVisit.visit_id);

        await logAuditTrail({
            userId: health_worker_id,
            tableName: 'prenatalVisit',
            actionType: 'CREATE',
            newState: newPrenatalVisit
        });

        return res.status(200).json({
            message: "Prenatal Visit Registered Successfully",
            prenatalVisit: newPrenatalVisit,
            cdssAssessment: cdssAssessment,
        })

    } catch (error) {
        return next(error);
    }
};

const updatePrenatalVisit = async (req, res, next) => {

    try {
        
        const {visit_id} = req.params;

        const {
            trimester,
            visit_number,
            age_of_gestation_weeks,
            weight_kg,
            temperature_celsius,
            pulse_rate_bpm,
            bp_diastolic,
            bp_systolic,
            fundic_height_cm,
            fetal_heart_tone_bpm,
            chief_complaint,
            danger_signs_observed,
            risk_level_assessed,
        } = req.body;

        if(!visit_id) {
            return res.status(400).json({error: "Missing Visit ID"})
        }

        if(!(await validate.isPrenatalVisitExist(visit_id))) {
            return res.status(404).json({error: "Prenatal Visit not found"});
        }

        const vitalsValidationErrors = validate.validateClinicalVitals(req.body);
        if (vitalsValidationErrors.length > 0) {
            return res.status(400).json({ error: "Invalid Medical Data", details: vitalsValidationErrors });
        }

        const { strategy, version, ...clientData } = req.body;
        const mvccResult = await updateWithMVCC('prenatalVisit', visit_id, { version, ...clientData }, {
            strategy,
            userId: req.user?.user_id || req.user?.id
        });

        if (!mvccResult.resolved) {
            return res.status(409).json({
                error: "Conflict detected requiring manual review",
                details: mvccResult
            });
        }

        const updatedVisit = mvccResult.record;
        const cdssAssessment = await evaluate_clinical_vitals(updatedVisit.visit_id);

        return res.status(200).json({
            message: "Prenatal Visit Successfully Updated!",
            result: updatedVisit,
            strategyUsed: mvccResult.strategyUsed,
            cdssAssessment: cdssAssessment,
        });

        
    } catch (error) {
        return next(error);
    }
};

const deletePrenatalVisit = async (req, res, next) => {

    try {

        const {visit_id} = req.params;

        if(!visit_id) {
            return res.status(400).json({error : "Missing Visit ID"});
        }

        const existingVisit = await validate.isPrenatalVisitExist(visit_id);
        if(!existingVisit) {
            return res.status(404).json({error: "Prenatal Visit not found!"});
        }

        await prisma.prenatalVisit.delete({
            where : {visit_id : visit_id}
        });

        await logAuditTrail({
            userId: req.user?.user_id || req.user?.id || 'system',
            tableName: 'prenatalVisit',
            actionType: 'DELETE',
            previousState: existingVisit
        });

        return res.status(200).json({
            message : "Prenatal Visit Deleted Successfully!",
        });

    } catch (error) {
        return next(error);
    }
};

const getAllPrenatalVisits = async (req, res, next) => {
    try {

        const prenatalVisits = await prisma.prenatalVisit.findMany({
            include : {
                healthWorker : {
                    select : {
                        user_id : true,
                        first_name : true,
                        middle_name : true,
                        last_name : true,
                        role : true,
                        facility : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "All prenatal Visit Data Retreived Successfully!",
            result : prenatalVisits,
        });
        
    } catch (error) {
        return next(error);
    }
};

const getPrenatalVisitById = async (req, res, next) => {

    try {

        const {visit_id} = req.params;

        if(!visit_id) {
            return res.status(400).json({error : "Missing Visit ID!"});
        }

        const isVisitExist = await prisma.prenatalVisit.findUnique({
            where : {
                visit_id : visit_id
            }
        })

        if(!__isVisitExist) {
            return res.status(404).json({error: "Prenatal Visit not found!"});
        }

        const visitResult = await prisma.prenatalVisit.findUnique({
            where : {
                visit_id : visit_id
            },
            include : {
                healthWorker : {
                    select : {
                        user_id : true,
                        first_name : true,
                        middle_name : true,
                        last_name : true,
                        role : true,
                        facility : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Prenatal Visit Data Retreived Successfully",
            result : visitResult
        });
        
    } catch (error) {
        return next(error);
    }
}

const getPrentalVisitByPregnancy = async (req, res, next) => {

    try {

        const {pregnancy_id} = req.params;

        if(!pregnancy_id) {
            return res.status(400).json({error : "Missing Pregnancy ID!"});
        }

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy Not Found!"})
        }

        const visit = await prisma.prenatalVisit.findMany({
            where : {
                pregnancy_id : pregnancy_id
            },
            include : {
                healthWorker : {
                    select : {
                        user_id : true,
                        first_name : true,
                        middle_name : true,
                        last_name : true,
                        role : true,
                        facility : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Prenatal Visit Data Retreived Successfully",
            result : visit
        });
        
    } catch (error) {
        return next(error);
    }
    
};

const getAllPrenatalVisitsByMother = async (req, res, next) => {

    try {

        const {mother_id} = req.params;

        if(!mother_id) {
            return res.status(400).json("Missing Mother ID")
        }

        const motherRecord = await prisma.mother.findFirst({
            where: {
                OR: [
                    { mother_id: mother_id },
                    { user_id: mother_id }
                ]
            }
        });

        if (!motherRecord) {
            return res.status(404).json({ error: "Mother Not Found!" });
        }

        const visits = await prisma.prenatalVisit.findMany({
            where: {
                pregnancy: {
                    mother_id: motherRecord.mother_id
                }
            },
            include : {
                healthWorker : {
                    select : {
                        user_id : true,
                        first_name : true,
                        middle_name : true,
                        last_name : true,
                        role : true,
                        facility : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Prenatal Visit Data Retreived Successfully",
            result : visits
        });
        
    } catch (error) {
        return next(error);
    }

};

const getAllPrenatalVisitsByHealthWorker = async (req, res, next) => {

    try {

        const {health_worker_id} = req.params;

        if(!health_worker_id) {
            return res.status(400).json("Missing Health Worker ID");
        }

        if(!(await validate.isUserExist(health_worker_id))) {
            return res.status(404).json({error: "Health Worker Not Found!"});
        }

        const visits = await prisma.prenatalVisit.findMany({
            where : {
                health_worker_id : health_worker_id
            },
            include : {
                healthWorker : {
                    select : {
                        user_id : true,
                        first_name : true,
                        middle_name : true,
                        last_name : true,
                        role : true,
                        facility : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Prenatal Visit Data Retreived Successfully",
            result : visits
        });
        
    } catch (error) {
        return next(error);
    }

};

const getAllPrenatalVisitByFacility = async(req, res, next) => {

    try {

        const {facility_id} = req.params;

        if(!facility_id) {
            return res.status(400).json("Missing Facility ID")
        }

        if(!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({error: "Facility Not Found!"});
        }

        const visits = await prisma.prenatalVisit.findMany({
            where : {
                healthWorker : {
                    facility_id : facility_id
                }
            },
            include : {
                healthWorker : {
                    select : {
                        user_id : true,
                        first_name : true,
                        middle_name : true,
                        last_name : true,
                        role : true,
                        facility : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Prenatal Visit Data Retreived Successfully",
            result : visits
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    registerPrenatalVisit,
    updatePrenatalVisit,
    deletePrenatalVisit,
    getAllPrenatalVisits,
    getPrentalVisitByPregnancy,
    getAllPrenatalVisitsByMother,
    getAllPrenatalVisitsByHealthWorker,
    getAllPrenatalVisitByFacility,
    getPrenatalVisitById
}