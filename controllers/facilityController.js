const prisma = require('../util/db');
const validate = require('../util/validation');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const checkOtp = require('../services/otpServices');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("Warning: JWT_SECRET environment variable is missing.");
}

const registerFacility = async (req, res, next) => {
    try {
        const { facility_name, address, contact_number, email, type } = req.body;

        if (!facility_name || !address || !contact_number || !type) {
            return res.status(400).json({ error: "Facility Registration Failed. Required fields missing!" });
        }

        const isFacilityExist = await prisma.facility.findFirst({
            where: {
                OR: [
                    { facility_name: facility_name },
                    { email: email },
                ]
            },
        });

        if (isFacilityExist) {
            return res.status(400).json({ error: "Facility with the same credentials and name already exist!" });
        }

        const facility = await prisma.facility.create({
            data: {
                facility_name: facility_name,
                address: address,
                contact_number: contact_number,
                email: email,
                type: type,
            }
        });

        return res.status(200).json({
            message: "Facility successfully created",
            result: facility
        });
    } catch (error) {
        return next(error);
    }
};

const publicRegisterFacility = async (req, res, next) => {
    try {
        const {
            facility_name,
            type,
            address: facility_address,
            contact_number: facility_contact,
            facility_email,
            first_name,
            middle_name,
            last_name,
            phone_number,
            email,
            password,
            otp
        } = req.body;

        if (!facility_name || !type || !facility_address || !first_name || !last_name || !password || !otp) {
            return res.status(400).json({ error: "Missing required facility or admin registration fields." });
        }

        const identifier = email || phone_number;
        if (!identifier) {
            return res.status(400).json({ error: "Email or Phone Number is required for OTP verification." });
        }

        const isValidOtp = await checkOtp.verifyOTP(identifier, otp, 'registration');
        if (!isValidOtp) {
            return res.status(400).json({ error: "Invalid or expired OTP code." });
        }

        const isFacilityExist = await prisma.facility.findFirst({
            where: {
                OR: [
                    { facility_name: facility_name },
                    facility_email ? { email: facility_email } : undefined,
                ].filter(Boolean)
            }
        });

        if (isFacilityExist) {
            return res.status(400).json({ error: "A facility with the same name or email already exists." });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    phone_number ? { phone_number } : undefined,
                    email ? { email: email } : undefined,
                ].filter(Boolean)
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: "An account with this phone number or email already exists." });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await prisma.$transaction(async (tx) => {
            const newFacility = await tx.facility.create({
                data: {
                    facility_name,
                    address: facility_address,
                    contact_number: facility_contact || phone_number,
                    email: facility_email || email || "",
                    type,
                }
            });

            const adminUser = await tx.user.create({
                data: {
                    first_name,
                    middle_name: middle_name || "",
                    last_name,
                    role: "Admin",
                    phone_number: phone_number || null,
                    email: email || null,
                    password: hashedPassword,
                    address: facility_address,
                    facility_id: newFacility.facility_id,
                    sync_status: "synced",
                }
            });

            return { newFacility, adminUser };
        });

        const token = jwt.sign(
            { user_id: result.adminUser.user_id, role: result.adminUser.role, facility_id: result.newFacility.facility_id },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.status(201).json({
            message: "Facility and Admin account registered successfully",
            token: token,
            user: {
                user_id: result.adminUser.user_id,
                first_name: result.adminUser.first_name,
                middle_name: result.adminUser.middle_name || "",
                last_name: result.adminUser.last_name,
                role: result.adminUser.role,
                email: result.adminUser.email || "",
                phone_number: result.adminUser.phone_number || "",
                facility_id: result.newFacility.facility_id,
                facility_name: result.newFacility.facility_name,
            },
            facility: result.newFacility
        });

    } catch (error) {
        next(error);
    }
};

const getPublicFacilities = async (req, res, next) => {
    try {
        const facilities = await prisma.facility.findMany({
            select: {
                facility_id: true,
                facility_name: true,
                address: true,
                contact_number: true,
                type: true
            },
            orderBy: {
                facility_name: 'asc'
            }
        });

        return res.status(200).json({
            result: facilities
        });
    } catch (error) {
        next(error);
    }
};

const searchFacility = async (req, res, next) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({ error: "Missing search query" });
        }

        const facility = await prisma.facility.findMany({
            where: {
                OR: [
                    { facility_name: { contains: search, mode: 'insensitive' } },
                    { address: { contains: search, mode: 'insensitive' } },
                    { contact_number: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { type: { contains: search, mode: 'insensitive' } }
                ]
            },
        });

        if (facility.length === 0) {
            return res.status(404).json({ error: "No facility found!" });
        }

        return res.status(200).json({
            result: facility
        });
    } catch (error) {
        return next(error);
    }
};

const updateFacility = async (req, res, next) => {
    try {
        const { facility_id } = req.params;
        const { facility_name, contact_number, address, email, type } = req.body;

        if (!facility_id) {
            return res.status(400).json({ error: "Missing Facility ID!" });
        }

        const isFacilityExist = await prisma.facility.findUnique({
            where: { facility_id: facility_id },
        });

        if (!isFacilityExist) {
            return res.status(404).json({ error: "Facility Doesn't Exist!" });
        }

        const updatedFacility = await prisma.facility.update({
            where: { facility_id: facility_id },
            data: {
                facility_name: facility_name,
                address: address,
                contact_number: contact_number,
                email: email,
                type: type,
            },
        });

        return res.status(200).json({
            message: "Facility Successfully updated",
            result: updatedFacility,
        });
    } catch (error) {
        return next(error);
    }
};

const deleteFacility = async (req, res, next) => {
    try {
        const { facility_id } = req.params;

        if (!facility_id) {
            return res.status(400).json({ error: "Missing Facility ID!" });
        }

        if (!(await validate.isFacilityExist(facility_id))) {
            return res.status(404).json({ error: "Facility Doesn't Exist!" });
        }

        await prisma.facility.delete({
            where: { facility_id: facility_id }
        });

        return res.status(200).json({
            message: "Facility Successfully Deleted"
        });
    } catch (error) {
        return next(error);
    }
};

const viewAllFacility = async (req, res, next) => {
    try {
        const facility = await prisma.facility.findMany({
            select: {
                facility_id: true,
                facility_name: true,
                address: true,
                contact_number: true,
                email: true,
                type: true
            }
        });

        return res.status(200).json({
            message: "Viewed all Facility",
            result: facility
        });
    } catch (error) {
        return next(error);
    }
};

const getFacilityById = async (req, res, next) => {
    try {
        const { facility_id } = req.params;
        if (!facility_id) {
            return res.status(400).json({ error: "Missing Facility ID!" });
        }
        const facility = await prisma.facility.findUnique({
            where: { facility_id: facility_id }
        });
        if (!facility) {
            return res.status(404).json({ error: "Facility Doesn't Exist!" });
        }
        return res.status(200).json({
            message: "Facility Retrieved Successfully",
            result: facility
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    registerFacility,
    publicRegisterFacility,
    getPublicFacilities,
    searchFacility,
    updateFacility,
    deleteFacility,
    viewAllFacility,
    getFacilityById,
};