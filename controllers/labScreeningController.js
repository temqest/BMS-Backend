const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const registerLabScreening = async (req, res, next) => {
    try {
        const {pregnancy_id, visit_id, screening_type, result, date_of_screening, remarks} = req.body;

        if(!pregnancy_id || !visit_id || !screening_type || !result || !date_of_screening) {
            return res.status(400).json({error : "Missing Required Fields"});
        }

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy Not Found!"});
        }

        if(!(await validate.isPrenatalVisitExist(visit_id))) {
            return res.status(404).json({error: "Visit Not Found!"});
        }

        const labScreening = await prisma.lab_Screening.create({
            data : {
                pregnancy_id : pregnancy_id,
                visit_id : visit_id,
                screening_type : screening_type,
                result : result,
                date_of_screening : date_of_screening,
                remarks : remarks,
                sync_status : "synced"
            }
        });

        res.status(200).json({
            message : "Lab Screening Successfully Registered!",
            data : labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const updateLabScreening = async (req, res, next) => {
    try {
        const {screening_id} = req.params;
        const { strategy, version, ...clientData } = req.body;

        if(!(await validate.isLabScreeningExist(screening_id))) {
            return res.status(404).json({error: "Lab Screening Not Found!"});
        }

        const mvccResult = await updateWithMVCC('lab_Screening', screening_id, { version, ...clientData }, {
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
            message : "Lab Screening Updated Successfully!",
            data : mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch (error) {
        return next(error);
    }
};

const deleteLabScreening = async (req, res, next) => {
    try {
        const {screening_id} = req.params;

        if(!(await validate.isLabScreeningExist(screening_id))) {
            return res.status(404).json({error: "Lab Screening Not Found!"});
        }

        await prisma.lab_Screening.delete({
            where : {screening_id : screening_id}
        });

        return res.status(200).json({
            message : "Lab Screening Deleted Successfully!"
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningById = async (req, res, next) => {
    try {
        const {screening_id} = req.params;

        const isScreeningExist = await validate.isLabScreeningExist(screening_id);
        if(!isScreeningExist) {
            return res.status(404).json({error: "Lab Screening Not Found!"});
        }

        return res.status(200).json({
            message : "Lab Screening Fetched Successfully!",
            data : isScreeningExist
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByPregnancy = async (req, res, next) => {
    try {
        const {pregnancy_id} = req.params;

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy Not Found!"});
        }

        const labScreening = await prisma.lab_Screening.findMany({
            where : {pregnancy_id : pregnancy_id},
            include : {
                visit : {
                    select : {
                        visit_date : true,
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Lab Screening Successfully Retrived",
            data : labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByVisit = async (req, res, next) => {
    try {
        const {visit_id} = req.params;

        if(!(await validate.isPrenatalVisitExist(visit_id))) {
            return res.status(404).json({error: "Visit Not Found!"});
        }

        const labScreening = await prisma.lab_Screening.findMany({
            where : {visit_id : visit_id}
        });

        return res.status(200).json({
            message : "Lab Screening Successfully Retrived",
            data : labScreening
        });

    } catch (error) {
        return next(error);
    }
};

const getLabScreeningByMother = async (req, res, next) => {

    try {

        const {mother_id} = req.params;

        const isMotherExist = await validate.isMotherExistExist(mother_id)

        if(!isMotherExist) {
            return res.status(404).json({error : "Mother Doesn't Exist"})
        }

        const pregnancies = await prisma.pregnancy.findMany({
            where : {
                mother_id : mother_id, 
                select : {pregnancy_id : true}
            }
        })

        if(!pregnancies || pregnancies.length === 0) {
            return res.status(200).json({error : "No Pregnancies Found", 
                data: []
            });
        }

        
        const pregnancyIds = pregnancies.map(p => p.pregnancy_id);

        const labScreening = await prisma.lab_Screening.findMany({
            where : {
                pregnancy_id : {in : pregnancyIds}
            }, orderBy : {
                date_of_screening : "desc"
            }
        });

        if(labScreening.length === 0) {
            return res.status(404).json({error : "No Lab Screenings Found", 
                data : []
            })
        }

        return res.status(200).json({
            message : "Lab Screenings Successfully Retrieved",
            data : response
        })

    } catch (error) {
        return next(error)
    }
}

module.exports = {
    registerLabScreening,
    updateLabScreening,
    deleteLabScreening,
    getLabScreeningById,
    getLabScreeningByPregnancy,
    getLabScreeningByVisit,
    getLabScreeningByMother
};