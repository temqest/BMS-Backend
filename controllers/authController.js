const prisma = require('../util/db');
const validate = require('../util/validation');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SYSTEM_ADMIN_BYPASS_CODE = process.env.BYPASSCODE

const checkOtp = require('../services/otpServices');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-maternal-key-change-in-production'

const register = async (req, res, next) => {

    try {
        const { first_name, middle_name, last_name, role, phone_number, email, password, address, facility_id, otp, bypassCode } = req.body;

        if(!first_name || !last_name || !role || !phone_number || !password || !otp){
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const restrictedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Doctor', 'Nurse', 'Midwife', 'Staff'];
        if (restrictedRoles.includes(role)) {
            if (role === "SystemAdmin" || role === "Admin") {
                if (bypassCode !== SYSTEM_ADMIN_BYPASS_CODE) {
                    return res.status(403).json({ error: "Privileged role registration requires a valid bypass authorization code." });
                }
            } else {
                return res.status(403).json({ error: "Staff account creation must be performed by an authorized facility admin." });
            }
        }
    
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone_number: phone_number},
                    { email: email || 'N/A'},
                ]
            }
        });

        if(existingUser) {
            return res.status(400).json({ error: 'Phone number or email is already registered'})
        }

        const purpose = 'registration'

        const identifier = email ? email : phone_number;
        
        const isValidOtp = await checkOtp.verifyOTP(identifier, otp, purpose)

        if(!isValidOtp) {
            return res.status(400).json({error : "Invalid OTP"})
        }

        const salt = await bcrypt.genSalt(14);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                first_name,
                middle_name,
                last_name,
                role,
                phone_number,
                email,
                password: hashedPassword,
                address,
                facility_id,
                sync_status: 'synced',
            },
        });

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, facility_id: user.facility_id},
            JWT_SECRET,
            {expiresIn: "30d"}
        );

        let facilityName = "";
        if (facility_id) {
            const facility = await prisma.facility.findUnique({
                where: { facility_id }
            });
            if (facility) {
                facilityName = facility.facility_name;
            }
        }

        res.status(201).json({
            message: "Account registered succesfully",
            token: token,
            user: {
                user_id: user.user_id,
                first_name: user.first_name,
                middle_name: user.middle_name || "",
                last_name: user.last_name,
                role: user.role,
                facility_name: facilityName,
            },
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {

    try {
        const { identifier, password} = req.body;

        if (!identifier || !password) {
            return res.status(400).json({error: "Identifier (phone/email) and password are missing"})
        }

        const user  = await prisma.user.findFirst({
            where: {
                OR: [
                    {phone_number : identifier},
                    {email : identifier},
                ],
                is_active : true
            },
            include: {facility : true},
        });

        if (!user) {
            return res.status(401).json({error: "Athentication Failed. User not found!"});
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({error: "Authentication Failed. Incorrect Password!"});
        }

        const token = jwt.sign(
            { user_id : user.user_id, role: user.role, facility_id: user.facility_id},
            JWT_SECRET,
            { expiresIn: "30d"}
        );

        res.status(200).json({
            message: "Login Successful",
            token: token,
            user: {
                user_id : user.user_id,
                first_name : user.first_name,
                middle_name : user.middle_name,
                last_name : user.middle_name,
                role: user.role,
                facility_name : user.facility ? user.facility.facility_name : "",
            },
        });
    } catch (error) {
        next(error);
    }
}

const createStaff = async (req, res, next) => {
    try {
        const { first_name, middle_name, last_name, role, phone_number, email, password, address, facility_id } = req.body;

        if (!first_name || !last_name || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const allowedStaffRoles = ['Admin', 'Doctor', 'Nurse', 'Midwife', 'Staff'];
        if (!allowedStaffRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid staff role specified' });
        }

        if (role === "Admin" && req.user?.role !== "Admin") {
            return res.status(403).json({ error: "Only Admin can create another Admin" });
        }

        if (phone_number || email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        phone_number ? { phone_number } : undefined,
                        email ? { email } : undefined,
                    ].filter(Boolean)
                }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Phone number or email is already registered' });
            }
        }

        let targetFacilityId = req.user?.facility_id || null;

        if (req.user?.role === 'SystemAdmin') {
            targetFacilityId = facility_id || req.user?.facility_id || null;
        } else if (facility_id && facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "Access Denied. You cannot assign staff to a different facility." });
        }

        const salt = await bcrypt.genSalt(14);
        const hashedPassword = await bcrypt.hash(password, salt);

        const staffUser = await prisma.user.create({
            data: {
                first_name,
                middle_name,
                last_name,
                role,
                phone_number,
                email,
                password: hashedPassword,
                address: address || '',
                facility_id: targetFacilityId,
                sync_status: 'synced',
            },
        });

        let facilityName = "";
        if (targetFacilityId) {
            const facility = await prisma.facility.findUnique({
                where: { facility_id: targetFacilityId }
            });
            if (facility) {
                facilityName = facility.facility_name;
            }
        }

        return res.status(201).json({
            message: "Staff account created successfully",
            user: {
                user_id: staffUser.user_id,
                first_name: staffUser.first_name,
                middle_name: staffUser.middle_name || "",
                last_name: staffUser.last_name,
                role: staffUser.role,
                email: staffUser.email,
                phone_number: staffUser.phone_number,
                facility_name: facilityName,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    createStaff,
};