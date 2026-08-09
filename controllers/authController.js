const prisma = require('../util/db');
const validate = require('../util/validation');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-maternal-key-change-in-production'

const register = async (req, res, next) => {

    try {
        const { first_name, middle_name, last_name, role, phone_number, email, password, address, facility_id } = req.body;

        if(!first_name || !last_name || !role || !phone_number || !facility_id || !password){
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const facility = await prisma.facility.findUnique({
            where: {facility_id: facility_id},
        });

        if(!facility) {
            return res.status(404).json({ error: `Facility with ID ${facility_id} does not exist`})
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

        res.status(201).json({
            message: "Account registered succesfully",
            token: token,
            user: {
                user_id: user.user_id,
                first_name: user.first_name,
                middle_name: user.middle_name || "",
                last_name: user.last_name,
                role: user.role,
                facility_name: facility.facility_name,
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
                facility_name : user.facility.facility_name,
            },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register,
    login,
};