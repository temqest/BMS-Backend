const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const createImmunizationRecord = async (req, res, next) => {
    try {
        const {vaccine_dose, date_administered, fully_immunized_mother, pregnancy_id} = req.body;

        if(!pregnancy_id || !vaccine_dose || !date_administered || fully_immunized_mother === undefined){
            return res.status(400).json({error : "Missing Required Fields"});
        }

        if(!(await validate.isPregnancyExist(pregnancy_id))) {
            return res.status(404).json({error: "Pregnancy Not Found"});
        }

        const vaccine = await prisma.immunization_Record.create({
            data : {
                pregnancy_id : pregnancy_id,
                vaccine_dose : vaccine_dose,
                date_administered : new Date(date_administered),
                fully_immunized_mother : fully_immunized_mother,
                sync_status : "synced",
            }
        });

        return res.status(200).json({
            message : "Vaccine Record Created Successfully",
            data : vaccine
        });

    } catch (error) {
        return next(error);
    }
};

const updateImmunizationRecord = async (req, res, next) => {
    try {
        const {immunization_id} = req.params;
        const { strategy, version, ...clientData } = req.body;

        if(!immunization_id) {
            return res.status(400).json({error : "Missing Required Fields"});
        }

        if(!(await validate.isImmunizationRecordExist(immunization_id))) {
            return res.status(404).json({error: "Immunization Record Doesn't Exist!"});
        }

        if (clientData.date_administered) {
            clientData.date_administered = new Date(clientData.date_administered);
        }

        const mvccResult = await updateWithMVCC('immunization_Record', immunization_id, { version, ...clientData }, {
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
            message : "Immunization Record Updated Successfully",
            data : mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });

    } catch(error) {
        return next(error);
    }
};

const deleteImmunizationRecord = async (req, res, next) => {
    try {
        const {immunization_id} = req.params;

        if(!immunization_id) {
            return res.status(400).json({error : "Immunization ID is Missing!"});
        }

        if(!(await validate.isImmunizationRecordExist(immunization_id))) {
            return res.status(404).json({error: "Immunization Record Doesn't Exist!"});
        }

        await prisma.immunization_Record.delete({
            where : {immunization_id : immunization_id}
        });

        return res.status(200).json({
            message : "Immunization Record Deleted Successfully"
        });

    } catch(error) {
        return next(error);
    }
};

const getImmunizationRecordById = async (req, res, next) => {
    try {
        const {immunization_id} = req.params;

        if(!immunization_id) {
            return res.status(400).json({error : "Immunization ID is Missing!"});
        }

        const immunization = await prisma.immunization_Record.findUnique({
            where : {immunization_id : immunization_id}
        });

        if(!immunization) {
            return res.status(404).json({error: "Immunization Record Doesn't Exist!"});
        }

        return res.status(200).json({
            message : "Immunization Record Found Successfully",
            data : immunization
        });
    } catch (error) {
        return next(error);
    }
};

const getImmunizationRecordByPregnancyId = async (req, res, next) => {
    try {
        const {pregnancy_id} = req.params;

        if(!pregnancy_id) {
            return res.status(400).json({error : "Pregnancy ID is Missing!"});
        }

        const immunization = await prisma.immunization_Record.findMany({
            where : {pregnancy_id : pregnancy_id}
        });

        if(!immunization) {
            return res.status(404).json({error: "Immunization Record Doesn't Exist!"});
        }

        return res.status(200).json({
            message : "Immunization Record Found Successfully",
            data : immunization
        });
    } catch(error) {
        return next(error);
    }
};

module.exports = {
    createImmunizationRecord,
    updateImmunizationRecord,
    deleteImmunizationRecord,
    getImmunizationRecordById,
    getImmunizationRecordByPregnancyId
};
