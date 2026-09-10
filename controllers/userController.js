const prisma = require('../util/db');

const getStaffByFacility = async (req, res, next) => {
    try {
        const facility_id = req.query.facility_id || req.user?.facility_id;
        
        let whereCondition = {};
        if (facility_id) {
            whereCondition.facility_id = facility_id;
        }

        const staff = await prisma.user.findMany({
            where: whereCondition,
            select: {
                user_id: true,
                facility_id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                role: true,
                phone_number: true,
                email: true,
                address: true,
                profile_url: true,
                is_active: true,
                updated_at: true,
                facility: {
                    select: {
                        facility_id: true,
                        facility_name: true,
                        type: true
                    }
                }
            },
            orderBy: {
                updated_at: 'desc'
            }
        });

        return res.status(200).json({
            message: "Staff list retrieved successfully",
            result: staff
        });
    } catch (error) {
        return next(error);
    }
};

const getStaffById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: id },
            select: {
                user_id: true,
                facility_id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                role: true,
                phone_number: true,
                email: true,
                address: true,
                profile_url: true,
                is_active: true,
                updated_at: true,
                facility: {
                    select: {
                        facility_id: true,
                        facility_name: true,
                        address: true,
                        contact_number: true,
                        type: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({
            message: "Staff member fetched successfully",
            result: user
        });
    } catch (error) {
        return next(error);
    }
};

const updateStaffRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!id) {
            return res.status(400).json({ error: "User ID is required" });
        }

        if (!role) {
            return res.status(400).json({ error: "Role is required" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const updatedUser = await prisma.user.update({
            where: { user_id: id },
            data: { role },
            select: {
                user_id: true,
                facility_id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                role: true,
                phone_number: true,
                email: true,
                address: true,
                profile_url: true,
                is_active: true,
                updated_at: true,
            }
        });

        return res.status(200).json({
            message: "Staff role updated successfully",
            result: updatedUser
        });
    } catch (error) {
        return next(error);
    }
};

const deactivateStaff = async (req, res, next) => {
    try {
        const { id } = req.params;
        const is_active = req.body.is_active !== undefined ? Boolean(req.body.is_active) : false;

        if (!id) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const updatedUser = await prisma.user.update({
            where: { user_id: id },
            data: { is_active },
            select: {
                user_id: true,
                facility_id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                role: true,
                phone_number: true,
                email: true,
                address: true,
                profile_url: true,
                is_active: true,
                updated_at: true,
            }
        });

        return res.status(200).json({
            message: `Staff account ${is_active ? 'activated' : 'deactivated'} successfully`,
            result: updatedUser
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getStaffByFacility,
    getStaffById,
    updateStaffRole,
    deactivateStaff
};
