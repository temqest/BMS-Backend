const prisma = require('../util/db');
const { isUserExist, isMotherExist, isPregnancyExist, isFacilityExist, isPrenatalVisitExist, isDeliveryOutcomeExist, isNewbornExist, isPostpartumVisitExist, isLabScreeningExist, isImmunizationRecordExist, isSupplementRecordExist, isNotificationExist } = require('../util/validation');


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

        const pregnancy = await prisma.pregnancy.findUnique({
            where : {pregnancy_id : pregnancy_id}
        });

        if(!pregnancy) {
            return res.status(404).json({error: "Pregnancy Not Found!"});
        }

        const health_worker = await prisma.user.findUnique({
            where : { user_id : health_worker_id}
        });

        if(!health_worker) {
            return res.status(404).json({error: "Health Worker Not Found!"});
        }

        const newPrenatalVisit = await prisma.prenatalVisit.create({
            data : {
                pregnancy_id : pregnancy_id,
                health_worker_id : health_worker_id,
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

        return res.status(200).json({
            message: "Prenatal Visit Registered Successfully",
            prenatalVisit: newPrenatalVisit,
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

        const _isVisitExist = await isPrenatalVisitExist(visit_id);

        if(!__isVisitExist) {
            return res.status(404).json({error: "Prenatal Visit not found"});
        }

        const updatedVisit = await prisma.prenatalVisit.update({
            where : {
                visit_id : visit_id
            },
            data : {
                trimester: trimester,
                visit_number: visit_number,
                age_of_gestation_weeks: age_of_gestation_weeks,
                weight_kg: weight_kg,
                temperature_celsius: temperature_celsius,
                pulse_rate_bpm: pulse_rate_bpm,
                bp_diastolic: bp_diastolic,
                bp_systolic: bp_systolic,
                fundic_height_cm: fundic_height_cm,
                fetal_heart_tone_bpm: fetal_heart_tone_bpm,
                chief_complaint: chief_complaint,
                danger_signs_observed: danger_signs_observed,
                risk_level_assessed: risk_level_assessed,
                sync_status: "synced",
            }
        });

        return res.status(200).json({
            message : "Prenatal Visit Successfully Updated!",
            result : updatedVisit,
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

        const _isVisitExist = await isPrenatalVisitExist(visit_id);

        if(!__isVisitExist) {
            return res.status(404).json({error: "Prenatal Visit not found!"});
        }

        await prisma.prenatalVisit.delete({
            where : {visit_id : visit_id}
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

        const _isPregnancyExist = await isPregnancyExist(pregnancy_id);

        if(!__isPregnancyExist) {
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

        const _isMotherExist = await isMotherExist(mother_id);

        if(!__isMotherExist) {
            return res.status(404).json({error: "Mother Not Found!"})
        }

        const visits = await prisma.prenatalVisit.findMany({
            where : {
                pregnancy : {
                    mother_id : mother_id
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

        const _isHealthWorkerExist = await isUserExist(health_worker_id);

        if(!__isHealthWorkerExist) {
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

        const _isFacilityExist = await isFacilityExist(facility_id);

        if(!__isFacilityExist) {
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