const prisma = require('../util/db');
const bcrypt = require('bcryptjs');
const { logAuditTrail } = require('../services/auditService');

const getStaffByFacility = async (req, res, next) => {
    try {
        let facility_id = req.query.facility_id || req.user?.facility_id;

        if (!facility_id && req.user?.user_id) {
            const dbUser = await prisma.user.findUnique({
                where: { user_id: req.user.user_id },
                select: { facility_id: true }
            });
            facility_id = dbUser?.facility_id;
        }

        if (!facility_id) {
            return res.status(200).json({
                message: "No facility associated with user",
                result: []
            });
        }
        
        const whereCondition = {
            facility_id: facility_id,
            is_active: true,
            role: {
                notIn: ['Mother', 'MOTHER']
            }
        };

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
        const requestingUser = req.user;

        if (!id) {
            return res.status(400).json({ error: "User ID is required" });
        }

        if (!role) {
            return res.status(400).json({ error: "Role is required" });
        }

        // Only Admin or SystemAdmin can modify another user's role/account
        const isSuperAdmin = requestingUser?.role === 'SystemAdmin';
        const isAdmin = requestingUser?.role === 'Admin';

        if (!isSuperAdmin && !isAdmin) {
            return res.status(403).json({ error: "Access Denied. Only an administrator can modify account roles." });
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // If target user is an Admin in a facility and being changed to a non-admin role:
        // ensure there is at least one other active Admin in that facility
        if (existingUser.role === 'Admin' && role !== 'Admin' && existingUser.facility_id) {
            const otherActiveAdminCount = await prisma.user.count({
                where: {
                    facility_id: existingUser.facility_id,
                    role: 'Admin',
                    is_active: true,
                    user_id: { not: existingUser.user_id }
                }
            });

            if (otherActiveAdminCount === 0) {
                return res.status(400).json({
                    error: "Cannot change role. There must be at least 1 active administrator per facility."
                });
            }
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
        const requestingUser = req.user;

        if (!id) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const isSelf = requestingUser?.user_id === existingUser.user_id;
        const isSuperAdmin = requestingUser?.role === 'SystemAdmin';
        const isAdmin = requestingUser?.role === 'Admin';

        // A user can self-deactivate, but cannot modify someone else's account unless SuperAdmin or Admin
        if (!isSelf && !isSuperAdmin && !isAdmin) {
            return res.status(403).json({ error: "Access Denied. You do not have permission to modify someone else's account." });
        }

        // If an account is being deactivated (is_active === false) and the target user is an Admin:
        // check that there is at least one other active Admin in their facility
        if (!is_active && existingUser.role === 'Admin' && existingUser.facility_id) {
            const otherActiveAdminCount = await prisma.user.count({
                where: {
                    facility_id: existingUser.facility_id,
                    role: 'Admin',
                    is_active: true,
                    user_id: { not: existingUser.user_id }
                }
            });

            if (otherActiveAdminCount === 0) {
                return res.status(400).json({
                    error: "Cannot deactivate account. There must be at least 1 active administrator per facility."
                });
            }
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

const updateUserProfile = async (req, res, next) => {
    try {
        const user_id = req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const { first_name, middle_name, last_name, phone_number, email, address, profile_url } = req.body;

        const updateData = {};
        if (first_name !== undefined) updateData.first_name = first_name;
        if (middle_name !== undefined) updateData.middle_name = middle_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (phone_number !== undefined) updateData.phone_number = phone_number;
        if (email !== undefined) updateData.email = email;
        if (address !== undefined) updateData.address = address;
        if (profile_url !== undefined) updateData.profile_url = profile_url;

        const updatedUser = await prisma.user.update({
            where: { user_id },
            data: updateData,
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
            }
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            result: updatedUser
        });
    } catch (error) {
        return next(error);
    }
};

const adminResetStaffPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const requestingUser = req.user;

        const isSuperAdmin = requestingUser?.role === 'SystemAdmin';
        const isAdmin = requestingUser?.role === 'Admin';

        if (!isSuperAdmin && !isAdmin) {
            return res.status(403).json({ error: "Access Denied. Only administrators can reset staff passwords." });
        }

        if (!id) {
            return res.status(400).json({ error: "Staff User ID is required." });
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
            return res.status(400).json({ error: "New password is required and must be at least 6 characters long." });
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "User not found." });
        }

        const salt = await bcrypt.genSalt(14);
        const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

        await prisma.user.update({
            where: { user_id: id },
            data: { 
                password: hashedPassword,
                updated_at: new Date()
            }
        });

        await logAuditTrail({
            userId: requestingUser.user_id,
            tableName: 'User',
            actionType: 'UPDATE',
            previousState: { action: 'admin_password_reset', target_user_id: id },
            newState: { action: 'admin_password_reset', target_user_id: id, timestamp: new Date().toISOString() }
        });

        return res.status(200).json({
            message: "Staff password has been successfully reset.",
            success: true
        });
    } catch (error) {
        return next(error);
    }
};

const getStaffActivities = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "User ID is required." });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: id },
            select: { user_id: true, first_name: true, last_name: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // 1. Fetch audit logs created by this user
        const auditLogs = await prisma.audit_Revision_Log.findMany({
            where: { user_id: id },
            take: 100,
            orderBy: { client_timestamp: 'desc' }
        });

        // 2. Fetch clinical prenatal visits handled by this user
        const visits = await prisma.prenatalVisit.findMany({
            where: { health_worker_id: id },
            take: 100,
            include: {
                pregnancy: {
                    include: {
                        mother: {
                            include: {
                                user: {
                                    select: {
                                        first_name: true,
                                        middle_name: true,
                                        last_name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { visit_date: 'desc' }
        });

        // Map visits to unified activity objects
        const visitActivities = visits.map(v => {
            const motherUser = v.pregnancy?.mother?.user;
            const motherName = motherUser 
                ? `${motherUser.first_name || ''} ${motherUser.last_name || ''}`.trim() 
                : 'Maternal Patient';

            return {
                id: `visit-${v.visit_id}`,
                type: 'visit',
                title: `Logged Vitals & Clinical Visit`,
                subtitle: `for ${motherName}`,
                patientName: motherName,
                details: `Trimester ${v.trimester} • BP: ${v.bp_systolic}/${v.bp_diastolic} mmHg • Risk: ${v.risk_level_assessed || 'Normal'}`,
                timestamp: v.visit_date || v.updated_at,
                iconType: 'activity'
            };
        });

        // Map audit logs to unified activity objects
        const auditActivities = auditLogs.map(log => {
            let parsedNewState = null;
            try {
                if (log.new_state) {
                    parsedNewState = typeof log.new_state === 'string' ? JSON.parse(log.new_state) : log.new_state;
                }
            } catch {
                parsedNewState = null;
            }

            let title = `${log.action_type || 'Updated'} Record`;
            let subtitle = '';
            let iconType = 'settings';
            let patientName = '';

            if (log.table_name === 'User') {
                title = `Account ${log.action_type === 'CREATE' ? 'Creation' : 'Modification'}`;
                subtitle = `User Account Settings`;
                iconType = 'user';
            } else if (log.table_name === 'Mother') {
                title = `Registered / Updated Mother Profile`;
                if (parsedNewState?.first_name || parsedNewState?.last_name) {
                    patientName = `${parsedNewState.first_name || ''} ${parsedNewState.last_name || ''}`.trim();
                    subtitle = `Patient: ${patientName}`;
                } else {
                    subtitle = `Maternal Registry Intake`;
                }
                iconType = 'user';
            } else if (log.table_name === 'PrenatalVisit') {
                title = `Prenatal Record Encounter`;
                subtitle = `Clinical Encounter Log`;
                iconType = 'activity';
            } else if (log.table_name === 'Online_Referral') {
                title = `Initiated / Processed Referral`;
                subtitle = parsedNewState?.reason ? `Reason: ${parsedNewState.reason}` : `Inter-Clinic Referral Action`;
                iconType = 'file';
            } else if (log.table_name === 'Pregnancy') {
                title = `Pregnancy Enrollment Intake`;
                subtitle = `Obstetric History & Registration`;
                iconType = 'activity';
            } else {
                title = `${log.action_type} on ${log.table_name}`;
                subtitle = `System Audit Trail`;
                iconType = 'settings';
            }

            return {
                id: `audit-${log.audit_id}`,
                type: 'audit',
                title,
                subtitle: subtitle || `Table: ${log.table_name}`,
                patientName,
                details: `Action: ${log.action_type}`,
                timestamp: log.client_timestamp,
                iconType
            };
        });

        // Combine and filter duplicates
        let combined = [...visitActivities, ...auditActivities];
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Search filtering
        const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
        if (search) {
            combined = combined.filter(act => 
                (act.title && act.title.toLowerCase().includes(search)) ||
                (act.subtitle && act.subtitle.toLowerCase().includes(search)) ||
                (act.patientName && act.patientName.toLowerCase().includes(search)) ||
                (act.details && act.details.toLowerCase().includes(search))
            );
        }

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const startIndex = (page - 1) * limit;
        const paginated = combined.slice(startIndex, startIndex + limit);
        const hasMore = startIndex + limit < combined.length;

        return res.status(200).json({
            message: "Staff activities retrieved successfully",
            result: {
                activities: paginated,
                hasMore,
                total: combined.length,
                page,
                limit
            }
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getStaffByFacility,
    getStaffById,
    updateStaffRole,
    deactivateStaff,
    updateUserProfile,
    adminResetStaffPassword,
    getStaffActivities
};
