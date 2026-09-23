const prisma = require('../util/db');
const bcrypt = require('bcryptjs');
const { logAuditTrail } = require('../services/auditService');
const path = require('path');
const fs = require('fs');

const SAFE_IMAGE_MIMES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

async function saveBase64ToFile(fileUrl, req) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('data:')) {
        return fileUrl;
    }

    try {
        const matches = fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
            const mimeType = matches[1].toLowerCase();
            const ext = SAFE_IMAGE_MIMES[mimeType] || 'jpg';

            if (!SAFE_IMAGE_MIMES[mimeType]) {
                console.warn(`[Security] Rejected unsupported avatar MIME type: ${mimeType}`);
                return null;
            }

            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

            try {
                const { supabase } = require('../util/storage');
                if (supabase && supabase.storage) {
                    const filePath = `profiles/${fileName}`;
                    let bucketName = 'documents';
                    let { data, error } = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, buffer, {
                            contentType: mimeType,
                            upsert: true
                        });

                    if (error && (error.message?.includes('Bucket not found') || error.statusCode === '404' || error.code === 'NoSuchBucket')) {
                        bucketName = 'avatars';
                        const retry = await supabase.storage
                            .from(bucketName)
                            .upload(filePath, buffer, {
                                contentType: mimeType,
                                upsert: true
                            });
                        data = retry.data;
                        error = retry.error;
                    }

                    if (!error && data) {
                        const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60 * 60 * 24 * 365);
                        const secureUrl = signedData?.signedUrl || (supabase.storage.from(bucketName).getPublicUrl(filePath)).data?.publicUrl;
                        if (secureUrl) {
                            return secureUrl;
                        }
                    } else if (error) {
                        console.warn("Supabase avatar upload skipped/failed:", error.message || error);
                    }
                }
            } catch (supErr) {
                console.warn("Supabase avatar upload error:", supErr.message);
            }

            const uploadsDir = path.join(__dirname, '../public/uploads');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const localFilePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(localFilePath, buffer);

            const isHttps = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https' || (req?.headers?.referer && req.headers.referer.startsWith('https'));
            const protocol = isHttps ? 'https' : (req?.protocol || 'https');
            const host = req?.get ? (req.get('host') || req.headers?.host) : (req?.headers?.host || null);
            const baseUrl = process.env.BACKEND_URL || (host ? `${protocol}://${host}` : `http://localhost:${process.env.PORT || 6700}`);
            return `${baseUrl}/uploads/${fileName}`;
        }
    } catch (err) {
        console.warn("Failed to convert base64 profile_url to file on server:", err);
    }

    return fileUrl;
}

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

        // Security & Scoping: If caller is a Mother, only return her assigned care provider or direct message contacts
        if (req.user?.role === 'Mother') {
            const motherRecord = await prisma.mother.findUnique({
                where: { user_id: req.user.user_id },
                include: { assignedWorker: true, creator: true }
            });

            const allowedWorkerId = motherRecord?.assigned_worker_id || motherRecord?.assignedWorker?.user_id || motherRecord?.created_by_id || motherRecord?.creator?.user_id;

            if (allowedWorkerId) {
                const assignedStaff = await prisma.user.findMany({
                    where: { user_id: allowedWorkerId, is_active: true },
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
                    message: "Assigned staff retrieved successfully",
                    result: assignedStaff
                });
            } else {
                const messagedStaff = await prisma.in_App_Message.findMany({
                    where: {
                        OR: [
                            { sender_id: req.user.user_id },
                            { receiver_id: req.user.user_id }
                        ]
                    },
                    select: { sender_id: true, receiver_id: true }
                });
                const contactIds = [...new Set(messagedStaff.flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== req.user.user_id))];
                if (contactIds.length > 0) {
                    const contacts = await prisma.user.findMany({
                        where: { user_id: { in: contactIds }, is_active: true },
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
                        message: "Contact staff retrieved successfully",
                        result: contacts
                    });
                }
                return res.status(200).json({
                    message: "No assigned staff for this mother",
                    result: []
                });
            }
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

        const isSuperAdmin = requestingUser?.role === 'SystemAdmin';
        const isAdmin = requestingUser?.role === 'Admin';

        if (!isSuperAdmin && !isAdmin) {
            return res.status(403).json({ error: "Only admins can modify account roles." });
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!isSuperAdmin) {
            if (existingUser.role === 'SystemAdmin') {
                return res.status(403).json({ error: "Facility admins cannot modify SystemAdmin accounts." });
            }
            if (existingUser.facility_id !== requestingUser?.facility_id) {
                return res.status(403).json({ error: "You cannot modify accounts from another facility." });
            }
            if (role === 'SystemAdmin') {
                return res.status(403).json({ error: "Only SystemAdmin can assign the SystemAdmin role." });
            }
        }

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
                    error: "Cannot change role. At least 1 active admin is required per facility."
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

        if (!isSelf && !isSuperAdmin && !isAdmin) {
            return res.status(403).json({ error: "You don't have permission to modify this account." });
        }

        if (!isSelf && !isSuperAdmin) {
            if (existingUser.role === 'SystemAdmin') {
                return res.status(403).json({ error: "Facility admins cannot modify SystemAdmin accounts." });
            }
            if (existingUser.facility_id !== requestingUser?.facility_id) {
                return res.status(403).json({ error: "You cannot modify accounts from another facility." });
            }
        }

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
                    error: "Cannot deactivate account. Facility must have at least 1 active admin."
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
        if (phone_number !== undefined) {
            updateData.phone_number = phone_number && typeof phone_number === 'string' && phone_number.trim() !== '' ? phone_number.trim() : null;
        }
        if (email !== undefined && typeof email === 'string' && email.trim() !== '') {
            updateData.email = email.trim().toLowerCase();
        }
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
            return res.status(403).json({ error: "Only admins can reset staff passwords." });
        }

        if (!id) {
            return res.status(400).json({ error: "Staff User ID is required" });
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!isSuperAdmin) {
            if (existingUser.role === 'SystemAdmin') {
                return res.status(403).json({ error: "Facility admins cannot reset SystemAdmin passwords." });
            }
            if (existingUser.facility_id !== requestingUser?.facility_id) {
                return res.status(403).json({ error: "Cannot reset passwords for staff in another facility." });
            }
        }

        const salt = await bcrypt.genSalt(12);
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
            message: "Staff password has been reset successfully.",
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
            return res.status(400).json({ error: "User ID is required" });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: id },
            select: { user_id: true, first_name: true, last_name: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const fetchLimit = Math.min(Math.max(limit * page + 10, 20), 50);

        const [auditLogs, visits] = await Promise.all([
            prisma.audit_Revision_Log.findMany({
                where: { user_id: id },
                take: fetchLimit,
                orderBy: { client_timestamp: 'desc' }
            }),
            prisma.prenatalVisit.findMany({
                where: { health_worker_id: id },
                take: fetchLimit,
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
            })
        ]);

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

        let combined = [...visitActivities, ...auditActivities];
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
        if (search) {
            combined = combined.filter(act => 
                (act.title && act.title.toLowerCase().includes(search)) ||
                (act.subtitle && act.subtitle.toLowerCase().includes(search)) ||
                (act.patientName && act.patientName.toLowerCase().includes(search)) ||
                (act.details && act.details.toLowerCase().includes(search))
            );
        }

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

const savePushToken = async (req, res, next) => {
    try {
        const user_id = req.user?.user_id;
        const fcmToken = req.body.fcmToken || req.body.fcm_token;

        if (!user_id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
            return res.status(400).json({ error: "A valid fcmToken is required." });
        }

        let updatedUser = null;

        try {
            updatedUser = await prisma.user.update({
                where: { user_id },
                data: {
                    fcm_token: fcmToken.trim(),
                    updated_at: new Date()
                },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    fcm_token: true,
                    updated_at: true
                }
            });
        } catch (prismaErr) {
            console.warn('[savePushToken] Prisma Client update failed, using raw SQL fallback:', prismaErr.message);

            await prisma.$executeRawUnsafe(
                `UPDATE "User" SET "fcm_token" = $1, "updated_at" = NOW() WHERE "user_id" = $2`,
                fcmToken.trim(),
                user_id
            );

            updatedUser = { user_id, fcm_token: fcmToken.trim() };
        }

        return res.status(200).json({
            success: true,
            message: "Push notification token registered successfully.",
            result: updatedUser
        });

    } catch (error) {
        return next(error);
    }
};

const updateStaffProfilePhoto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const rawPhoto = req.body.profile_url || req.body.photo_url;
        const requestingUser = req.user;

        if (!id) {
            return res.status(400).json({ error: "Staff User ID is required" });
        }

        const isSuperAdmin = requestingUser?.role === 'SystemAdmin';
        const isAdmin = requestingUser?.role === 'Admin';
        const isSelf = requestingUser?.user_id === id;

        if (!isSuperAdmin && !isAdmin && !isSelf) {
            return res.status(403).json({ error: "You are not authorized to update this user's profile photo." });
        }

        const targetUser = await prisma.user.findUnique({
            where: { user_id: id }
        });

        if (!targetUser) {
            return res.status(404).json({ error: "Staff member not found" });
        }

        if (!isSuperAdmin && !isSelf && targetUser.facility_id !== requestingUser?.facility_id) {
            return res.status(403).json({ error: "Cannot modify staff from another facility." });
        }

        let profile_url = rawPhoto ? await saveBase64ToFile(rawPhoto, req) : null;

        const updatedUser = await prisma.user.update({
            where: { user_id: id },
            data: {
                profile_url: profile_url,
                updated_at: new Date()
            },
            select: {
                user_id: true,
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
                facility_id: true
            }
        });

        return res.status(200).json({
            message: "Staff profile photo updated successfully",
            result: updatedUser,
            user: updatedUser
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
    getStaffActivities,
    savePushToken,
    updateStaffProfilePhoto
};

