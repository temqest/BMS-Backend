const prisma = require('../util/db')

const createImmunizationRecord = async (req, res, next) => {

    try {

        const {vaccine_dose, date_administered, fully_immunized_mother, pregnancy_id} = req.body;

        if(!pregnancy_id || !vaccine_dose || !date_administered || fully_immunized_mother === undefined){
            return res.status(400).json({error : "Missing Required Fields"});
        }

        const isPregnancyExist = await prisma.pregnancy.findUnique({
            where : {pregnancy_id : pregnancy_id}
        })

        if(!isPregnancyExist){
            return res.status(400).json({error : "Pregnancy Not Found"})
        }

        const vaccine = await prisma.immunization_Record.create({
            data : {
                pregnancy_id : pregnancy_id,
                vaccine_dose : vaccine_dose,
                date_administered : new Date(date_administered),
                fully_immunized_mother : fully_immunized_mother,
                sync_status : "synced",
            }
        })

        return res.status(200).json({
            message : "Vaccine Record Created Successfully",
            data : vaccine
        })

    } catch (error) {
        return next(error);
    }
};

const updateImmunizationRecord = async (req, res, next) => {

    try {

        const {immunization_id} = req.params;

        const {vaccine_dose, date_administered, fully_immunized_mother} = req.body;

        if(!immunization_id) {
            return res.status(400).json({error : "Missing Required Fields"})
        }

        const isImmunizationExist = await prisma.immunization_Record.findUnique({
            where : {immunization_id : immunization_id}
        });

        if(!isImmunizationExist) {
            return res.status(400).json({error : "Immunization Record Doesn't Exist!"});
        }

        const updateImmunizationRecord = await prisma.immunization_Record.update({
            where : {immunization_id : immunization_id},
            data : {
                vaccine_dose : vaccine_dose,
                date_administered : new Date(date_administered),
                fully_immunized_mother : fully_immunized_mother,
            }
        })

        return res.status(200).json({
            message : "Immunization Record Updated Successfully",
            data : updateImmunizationRecord
        })

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

        const isImmunizationExist = await prisma.immunization_Record.findUnique({
            where : {immunization_id : immunization_id}
        });

        if(!isImmunizationExist) {
            return res.status(400).json({error : "Immunization Record Doesn't Exist!"});
        }

        await prisma.immunization_Record.delete({
            where : {immunization_id : immunization_id}
        })

        return res.status(200).json({
            message : "Immunization Record Deleted Successfully"
        })

    } catch(error) {
        return next(error);
    }
}

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
            return res.status(400).json({error : "Immunization Record Doesn't Exist!"});
        }

        return res.status(200).json({
            message : "Immunization Record Found Successfully",
            data : immunization
        })
    } catch (error) {
        return next(error);
    }
}

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
            return res.status(400).json({error : "Immunization Record Doesn't Exist!"});
        }

        return res.status(200).json({
            message : "Immunization Record Found Successfully",
            data : immunization
        })
    } catch(error) {
        return next(error);
    }
}

module.exports = {
    createImmunizationRecord,
    updateImmunizationRecord,
    deleteImmunizationRecord,
    getImmunizationRecordById,
    getImmunizationRecordByPregnancyId
}



