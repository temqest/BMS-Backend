const prisma = require('../util/db');
const validate = require('../util/validation');
const { updateWithMVCC } = require('../services/conflicResolution');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-maternal-key-change-in-production'

const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const registerMother = async (req, res, next) => {

    try {

        const {
            first_name,
            middle_name,
            last_name,
            address,
            phone_number,
            email,
            facility_id,
            password,
            family_serial_no,
            birth_date, 
            civil_status, 
            blood_type
        } = req.body;

        if(!first_name || !last_name || !address || !birth_date || !civil_status) {
            return res.status(400).json({error: "Missing Required Fields!"});
        }

        const existingMother = await prisma.user.findFirst({
            where : {
                OR: [
                    {
                        first_name : first_name,
                        last_name : last_name,
                        mother : {
                            birth_date : new Date(birth_date),
                        }
                    },

                    ...(family_serial_no ? [{ mother : {
                        family_serial_no : family_serial_no
                    }}] : [])
                ]
            },
        });

        if(existingMother) {
            return res.status(400).json({error : "User already exist"});
        }

        const result = await prisma.$transaction(async(prismaClient) => {

            const user = await prismaClient.user.create({
                data : {
                    first_name : first_name,
                    middle_name : middle_name,
                    last_name : last_name,
                    address : address,
                    email : email,
                    phone_number : phone_number,
                    facility_id : facility_id,
                    role : "Mother",
                    sync_status : "synced",
                }
            });

            const mother = await prismaClient.mother.create({
                data : {
                    user_id : user.user_id,
                    family_serial_no : family_serial_no,
                    birth_date : new Date(birth_date),
                    age : calculateAge(birth_date),
                    civil_status : civil_status,
                    blood_type : blood_type,
                    sync_status : "synced",
                }
            });

            return {user, mother}
        })

        return res.status(200).json({
            message : "Mother registered successfully!",
            result : result
        });

    } catch (error) {
        return next(error);
    }

};

const selfRegisterMother = async (req, res, next) => {

    try {

        const { 
            first_name, 
            middle_name, 
            last_name, 
            phone_number, 
            email, 
            address, 
            password,
            family_serial_no, 
            birth_date, 
            civil_status, 
            blood_type
        } = req.body;

        if(!first_name || !last_name || !phone_number || !address || !password || !birth_date || !civil_status) {
            return res.status(400).json({error : "Missing Required Fields"});
        }

        const isMotherExist = await prisma.user.findFirst({
            where : {
                OR : [
                    {email : email},
                    {phone_number : phone_number}
                ]
            }
        });

        if(isMotherExist) {
            return res.status(400).json({error : "Account with the same credentials already exist"});
        }

        const salt = await bcrypt.genSalt(14);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await prisma.$transaction(async (prismaClient) => {
            const user = await prismaClient.user.create({
                data : {
                    first_name : first_name,
                    middle_name : middle_name,
                    last_name : last_name,
                    phone_number : phone_number,
                    email : email,
                    address : address,
                    password : hashedPassword,
                    role : "Mother",
                    sync_status : "synced",
                }
            });

            const mother = await prismaClient.mother.create({
                data : {
                    user_id : user.user_id,
                    family_serial_no : family_serial_no,
                    birth_date : new Date(birth_date),
                    age : calculateAge(birth_date),
                    civil_status : civil_status,
                    blood_type : blood_type,
                    sync_status : "synced",
                }
            });

            return { user, mother };
        });

        const token = jwt.sign({
            user_id : result.user.user_id,
            role : result.user.role,
            email : result.user.email,
            phone_number : result.user.phone_number,
        }, JWT_SECRET, {expiresIn: "30d"});

         return res.status(200).json({
            message : "Mother Registered Successfully",
            token : token,
            user : {
                user_id : result.user.user_id,
                first_name : result.user.first_name,
                middle_name : result.user.middle_name,
                last_name : result.user.last_name,
                address : result.user.address,
                phone_number : result.user.phone_number,
                email : result.user.email,
                birth_date : result.mother.birth_date,
                age : result.mother.age,
                civil_status : result.mother.civil_status,
                blood_type : result.mother.blood_type
            }
         });

    } catch (error) {
        return next(error);
    }
}

const updateMother = async (req, res, next) => {

    try {

        const {mother_id} = req.params;
        const {
            first_name, 
            middle_name, 
            last_name, 
            address, 
            phone_number, 
            email, 
            birth_date, 
            civil_status, 
            blood_type,
            is_active,
        } = req.body;

        if(!mother_id) {
            return res.status(400).json({error : "Mother ID is required"});
        }

        if(!(await validate.isMotherExist(mother_id))) {
            return res.status(403).json({error : "Mother not found"});
        }

        const { strategy, version, ...clientData } = req.body;
        if (clientData.birth_date) {
            clientData.birth_date = new Date(clientData.birth_date);
            clientData.age = calculateAge(clientData.birth_date);
        }

        const mvccResult = await updateWithMVCC('mother', mother_id, { version, ...clientData }, {
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
            message: "Mother updated successfully",
            result: mvccResult.record,
            strategyUsed: mvccResult.strategyUsed
        });


    } catch (error) {
        return next(error);
    }
};

const softDeleteMother = async (req, res, next) => {

    try {
        const {mother_id} = req.params;

        if(!mother_id) {
            return res.status(400).json({error : "Missing Mother ID"});
        }

        if(!(await validate.isMotherExist(mother_id))) {
            return res.status(404).json({error: "Mother not found!"});
        }

        const softDeletedResult = await prisma.user.update({
            where : {user_id : isMotherExist.user_id},
            data : {
                is_active : false
            }
        });

        return res.status(200).json({
            message : "Mother deleted successfully"
        });

    } catch (error) {
        return next(error);
    }
}

const hardDeleteMother = async (req, res, next) => {

    try {

        const {mother_id} = req.params;

        if(!mother_id) {
            return res.status(400).json({error : "Missing Mother ID"});
        }

        if(!(await validate.isMotherExist(mother_id))) {
            return res.status(404).json({error: "Mother not found!"});
        }

        const entireMother = await prisma.$transaction(async (prismaClient) => {

            const deletedMother = await prismaClient.mother.delete({
                where : {mother_id : mother_id},
                include : {
                    pregnancies : true,
                }
            });

            const deletedUser = await prismaClient.user.delete({
                where : {user_id : isMotherExist.user_id}
            });

            return { deletedUser, deletedMother}
        });

        res.status(200).json({
            message : "Mother deleted successfully",
            result : entireMother
        });

    } catch (error) {
        return next(error);
    }
}

const getAllActiveMother = async (req, res, next) => {
    try {
        const allActiveMothers = await prisma.mother.findMany({
            where: {
                user: {
                    role: "Mother",
                    is_active: true,
                }
            },
            include: {
                user: true,
            },
        });

        return res.status(200).json({
            message : "All active mothers",
            result : allActiveMothers
        });

    } catch (error) {
        return next(error)
    }
}

const searchMotherByID = async (req, res, next) => {
    try {
        const {mother_id} = req.params;

        if(!mother_id) {
            return res.status(400).json({error : "Missing Mother ID"});
        }

        const searchMotherResult = await prisma.mother.findUnique({
            where : {mother_id : mother_id},
            include : {
                user: true,
                pregnancies: {
                    include: {
                        prenatalVisits: true 
                    }
                }
            }
        });

        if(!__searchMotherResult) {
            return res.status(404).json({error : "Mother not found"});
        }

        res.status(200).json({
            message : "Mother found",
            result : searchMotherResult
        });

    } catch (error) {
        return next(error);
    }
}

const getAllMother = async (req, res, next) => {
    try {
        const allMothers = await prisma.mother.findMany({
            where: {
                user: {
                    role: "Mother"
                }
            },
            include : {
                user : true,
            },
        });

        return res.status(200).json({
            message : "All Mothers",
            result : allMothers
        });

    } catch (error) {
        return next(error)
    }
}

const getAllActiveMotherByFacility = async (req, res, next) => {

    try {

        const {facility_id} = req.params;

        if(!facility_id) {
            return res.status(400).json({error : "Missing facility ID"});
        }

        const facilityMothers = await prisma.mother.findMany({
            where : {
                user: {
                    facility_id: facility_id,
                    role: "Mother",
                    is_active: true
                }
            },
            include : {
                user: true,
                pregnancies: {
                    include: {
                        prenatalVisits: true
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Active mothers in facility retrieved",
            result: facilityMothers
        });

    } catch (error) {
        return next(error);
    }
}

const getProfile = async (req, res, next) => {

    try {
        
        const my_user_id = req.user.user_id;

        const myProfile = await prisma.mother.findUnique({
            where : {user_id : my_user_id},
            include : {
                user : true,
                pregnancies : true
            }
        });

        return res.status(200).json({
            message : "My profile retrieved successfully",
            result : myProfile
        });

    } catch (error) {
        return next(error);
    }
}

const updateMyProfile = async (req, res, next) => {

    try {

        const my_user_id = req.user.user_id;

        const {first_name, middle_name, last_name, address, phone_number, email, birth_date, civil_status, blood_type} = req.body;

        const updatedProfile = await prisma.$transaction(async (prismaClient) => {

            const user = await prismaClient.user.update({
                where : {user_id : my_user_id},
                data : {
                    first_name : first_name,
                    middle_name : middle_name,
                    last_name : last_name,
                    address : address,
                    phone_number : phone_number,
                    email : email,
                }
            })

            const mother = await prismaClient.mother.update({
                where : {user_id : my_user_id},
                data : {
                    birth_date : birth_date ? new Date(birth_date) : undefined,
                    age : birth_date ? calculateAge(birth_date) : undefined,
                    civil_status : civil_status,
                    blood_type : blood_type
                }
            })

            return {user, mother};
        });

        return res.status(200).json({
            message : "Profile updated successfully",
            result : updatedProfile
        })

    } catch (error) {
        return next(error);
    }

    
}


module.exports = {
    registerMother,
    selfRegisterMother,
    updateMother,
    hardDeleteMother,
    softDeleteMother,
    getAllActiveMother,
    getAllMother,
    searchMotherByID,
    getAllActiveMotherByFacility,
    updateMyProfile,
    getProfile
}