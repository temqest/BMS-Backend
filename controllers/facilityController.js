const prisma = require('../util/db');
const validate = require('../util/validation');


const registerFacility = async (req, res, next) => {

    try {
        const { facility_name, address, contact_number, email, type} = req.body;

        if(!facility_name || !address || !contact_number || !type) {
            return res.status(400).json({error : "Facility Registration Failed. Required fields missing!"});
        }

        const isFacilityExist = await prisma.facility.findFirst({
            where: {
                OR: [
                    {facility_name : facility_name},
                    {email : email},
                ]
            },
        });

        if(isFacilityExist) {
            return res.status(400).json({error: "Facility with the same credentials and name already exist!"});
        }

        const facility = await prisma.facility.create({
            data: {
                facility_name : facility_name,
                address : address,
                contact_number : contact_number,
                email : email,
                type : type,
            }
        });

        return res.status(200).json({
            message : "Facility successfully created",
            result : facility
        });
    }  catch (error) {
        return next(error);
    }

};

const searchFacility  = async (req, res, next) => {

    try {
        const { search } = req.query;

        if(!__search) {
            return res.status(400).json({error : "Missing search query"});
        }

        const facility = await prisma.facility.findMany({
            where: {
                OR : [
                    {facility_name: {contains: search, mode: 'insensitive'}},
                    {address : {contains: search, mode: 'insensitive'}},
                    {contact_number: {contains: search, mode: 'insensitive'}},
                    {email : {contains: search, mode: 'insensitive'}},
                    {type : {contains: search, mode: 'insensitive'}}
                ]
            },
        });

        if(facility.length === 0) {
            return res.status(404).json({error: "No facility found!"})
        }

        return res.status(200).json({
            result : facility
        });
    } catch (error) {
        return next(error);
    }
};

const updateFacility = async (req, res, next) => {

    try {
        const {facility_id} = req.params

        const {facility_name, contact_number, address, email, type} = req.body;

        if(!facility_id) {
            return res.status(400).json({error : "Missing Facility ID!"});
        }

        const isFacilityExist = await prisma.facility.findUnique({
            where: {
                facility_id : facility_id
            },
        });

        if(!__isFacilityExist) {
            return res.status(404).json({error : "Facility Doesn't Exist!"});
        }

        const updatedFacility = await prisma.facility.update({
            where: {
                facility_id : facility_id
            },
            data : {
                facility_name : facility_name,
                address : address,
                contact_number : contact_number,
                email : email,
                type : type,
            },
        });

        return res.status(200).json({
            message : "Facility Successfully updated",
            result : updatedFacility,
        });
    } catch (error) {
        return next(error);
    }
};

const deleteFacility = async (req, res, next) => {

    try {

        const {facility_id} = req.params;

        if(!facility_id) {
            return res.status(400).json({error : "Missing Facility ID!"});
        }

        if(!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({error : "Facility Doesn't Exist!"});
        }

        const deletedFacility = await prisma.facility.delete({
            where : {
                facility_id : facility_id
            }
        });

        return res.status(200).json({
            message : "Facility Successfully Deleted"
        });

    } catch (error) {
        return next(error);
    }
};

const viewAllFacility = async (req, res, next) => {

    try {

        const facility = await prisma.facility.findMany({
            select : {
                facility_id : true,
                facility_name : true,
                address : true,
                contact_number : true,
                email : true,
                type : true
            }
        })

        return res.status(200).json({
            message : "Viewed all Facility",
            result : facility
        })

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerFacility,
    searchFacility,
    updateFacility,
    deleteFacility,
    viewAllFacility,
};