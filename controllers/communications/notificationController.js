const prisma = require('../../util/db');
const validate = require('../../util/validation');
const { sendNotificationToUser: sendPushToUser } = require('../../services/pushNotificationService');

const sendNotificationToUser = async (req, res, next) => {
    try {
        const { user_id, notification_type, notification_message, notification_date } = req.body;

        if (!user_id || !notification_type || !notification_message) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!await validate.isUserExist(user_id)) {
            return res.status(404).json({ error: "User not found" });
        }

        const newNotification = await prisma.notification.create({
            data: {
                user_id: user_id,
                notification_type: notification_type,
                notification_message: notification_message,
                notification_date: notification_date ? new Date(notification_date) : undefined
            }
        });

        const socketService = req.socketService || require('../../services/socketService');
        socketService.emitToUser(user_id, 'notification:new', newNotification);

        sendPushToUser(
            user_id,
            notification_type,
            notification_message,
            { notification_id: newNotification.notification_id, type: notification_type }
        ).catch((pushErr) => {
            console.error('[NotificationController] Push notification warning:', pushErr);
        });

        return res.status(200).json({
            message: "Notification sent successfully",
            notification: newNotification
        });

    } catch (error) {
        return next(error);
    }
};

const getNotificationByID = async (req, res, next) => {
    try {
        const { notification_id } = req.params;

        if (!notification_id) {
            return res.status(400).json({ error: "Missing notification ID" });
        }

        const notification = await prisma.notification.findUnique({
            where: { notification_id: notification_id },
            include: {
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }

        return res.status(200).json({
            message: "Notification details retrieved",
            notification: notification
        });

    } catch (error) {
        return next(error);
    }
};

const getAllNotificationByUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: "Missing user ID" });
        }

        const notifications = await prisma.$queryRaw`
            WITH current_user_info AS (
                SELECT user_id, role, facility_id
                FROM "User"
                WHERE user_id = ${user_id}
                LIMIT 1
            ),
            user_read_receipts AS (
                SELECT notification_id
                FROM "Notification"
                WHERE user_id = ${user_id}
                  AND is_read = true
                  AND (
                    notification_id LIKE 'cdss-%'
                    OR notification_id LIKE 'ref-%'
                    OR notification_id LIKE 'app-%'
                    OR notification_type = 'facility_read_receipt'
                  )
            ),
            direct_notes AS (
                SELECT 
                    n.notification_id,
                    n.user_id,
                    n.notification_type,
                    n.notification_message,
                    n.notification_date,
                    n.is_read,
                    CASE 
                        WHEN n.notification_type = 'vitals' THEN 'Clinical Alert'
                        WHEN n.notification_type IN ('referral', 'Referral') THEN 'Referral Service'
                        WHEN n.notification_type = 'appointment' THEN 'Appointment Service'
                        WHEN n.notification_type IN ('team', 'PATIENT_ASSIGNMENT') THEN 'Team Management'
                        WHEN n.notification_type IN ('URGENT_ADMIN_ASSISTANCE', 'ADMIN_ASSISTANCE_REQUEST') THEN 'Admin Support'
                        ELSE 'System Alert'
                    END AS sender,
                    COALESCE(n.notification_type, 'system') AS category,
                    NULL::text AS link
                FROM "Notification" n
                WHERE n.user_id = ${user_id}
                  AND n.notification_id NOT LIKE 'cdss-%'
                  AND n.notification_id NOT LIKE 'ref-%'
                  AND n.notification_id NOT LIKE 'app-%'
                  AND (n.notification_type IS NULL OR n.notification_type != 'facility_read_receipt')
                  AND TRIM(COALESCE(n.notification_message, '')) != ''
                  AND LOWER(TRIM(COALESCE(n.notification_message, ''))) != 'alert'
                ORDER BY n.notification_date DESC
                LIMIT 50
            ),
            cdss_notes AS (
                SELECT 
                    'cdss-' || ca.alert_id AS notification_id,
                    ${user_id} AS user_id,
                    'vitals'::text AS notification_type,
                    'High-Risk CDSS Alert: ' || ca.alert_type || ' detected for ' || 
                        COALESCE(TRIM(u.first_name || ' ' || u.last_name), 'Patient') || ' (' || ca.alert_message || ')' AS notification_message,
                    ca.updated_at AS notification_date,
                    EXISTS(SELECT 1 FROM user_read_receipts urr WHERE urr.notification_id = 'cdss-' || ca.alert_id) AS is_read,
                    'Clinical CDSS System'::text AS sender,
                    'vitals'::text AS category,
                    '/dashboard/mothers'::text AS link
                FROM "CDSS_Alert" ca
                JOIN "Pregnancy" p ON ca.pregnancy_id = p.pregnancy_id
                JOIN "Mother" m ON p.mother_id = m.mother_id
                JOIN "User" u ON m.user_id = u.user_id
                JOIN current_user_info cui ON u.facility_id = cui.facility_id
                WHERE cui.facility_id IS NOT NULL 
                  AND cui.role NOT IN ('Mother', 'MOTHER')
                  AND ca.is_resolved = false
                  AND LOWER(ca.severity) IN ('high', 'critical', 'critical_risk')
                ORDER BY ca.updated_at DESC
                LIMIT 10
            ),
            referral_notes AS (
                SELECT 
                    'ref-' || r.referral_id AS notification_id,
                    ${user_id} AS user_id,
                    'referral'::text AS notification_type,
                    'Incoming Referral: ' || COALESCE(ff.facility_name, 'Partner Facility') || ' referred patient ' || 
                        COALESCE(TRIM(u.first_name || ' ' || u.last_name), 'Patient') || ' (' || COALESCE(r.reason, 'Maternal Case') || '). Status: ' || r.status AS notification_message,
                    r.date_referred AS notification_date,
                    (EXISTS(SELECT 1 FROM user_read_receipts urr WHERE urr.notification_id = 'ref-' || r.referral_id) OR r.status IN ('accepted', 'completed')) AS is_read,
                    COALESCE(ff.facility_name, 'Partner Facility') AS sender,
                    'referral'::text AS category,
                    '/dashboard/referrals'::text AS link
                FROM "Online_Referral" r
                LEFT JOIN "Facility" ff ON r.from_facility_id = ff.facility_id
                LEFT JOIN "Pregnancy" p ON r.pregnancy_id = p.pregnancy_id
                LEFT JOIN "Mother" m ON p.mother_id = m.mother_id
                LEFT JOIN "User" u ON m.user_id = u.user_id
                JOIN current_user_info cui ON r.to_facility_id = cui.facility_id
                WHERE cui.facility_id IS NOT NULL 
                  AND cui.role NOT IN ('Mother', 'MOTHER')
                  AND r.is_completed = false
                ORDER BY r.date_referred DESC
                LIMIT 10
            ),
            appointment_notes AS (
                SELECT 
                    'app-' || a.appointment_id AS notification_id,
                    ${user_id} AS user_id,
                    'appointment'::text AS notification_type,
                    'Upcoming Appointment: ' || a.appointment_type || ' for ' || 
                        COALESCE(TRIM(u.first_name || ' ' || u.last_name), 'Patient') || ' on ' || 
                        TO_CHAR(a.appointment_date, 'Mon DD') || ' at ' || a.appointment_time AS notification_message,
                    COALESCE(a.updated_at, a.appointment_date) AS notification_date,
                    EXISTS(SELECT 1 FROM user_read_receipts urr WHERE urr.notification_id = 'app-' || a.appointment_id) AS is_read,
                    'Appointment Service'::text AS sender,
                    'appointment'::text AS category,
                    '/dashboard/appointments'::text AS link
                FROM "Appointment" a
                LEFT JOIN "User" u ON a.user_id = u.user_id
                JOIN current_user_info cui ON a.facility_id = cui.facility_id
                WHERE cui.facility_id IS NOT NULL 
                  AND cui.role NOT IN ('Mother', 'MOTHER')
                  AND LOWER(a.status) IN ('scheduled', 'pending')
                ORDER BY a.appointment_date DESC
                LIMIT 10
            )
            SELECT * FROM direct_notes
            UNION ALL
            SELECT * FROM cdss_notes
            UNION ALL
            SELECT * FROM referral_notes
            UNION ALL
            SELECT * FROM appointment_notes
            ORDER BY notification_date DESC;
        `;

        if (notifications.length === 0) {
            const userExists = await prisma.user.findUnique({
                where: { user_id: user_id },
                select: { user_id: true }
            });
            if (!userExists) {
                return res.status(404).json({ error: "User not found" });
            }
        }

        return res.status(200).json({
            message: "Notifications fetched successfully",
            notifications: notifications
        });

    } catch (error) {
        return next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const { notification_id } = req.params;

        if (!notification_id) {
            return res.status(400).json({ error: "Missing notification ID" });
        }

        const existingNotification = await prisma.notification.findUnique({
            where: { notification_id: notification_id }
        });

        if (existingNotification) {
            await prisma.notification.delete({
                where: { notification_id: notification_id }
            });
        }

        return res.status(200).json({
            message: "Notification deleted"
        });

    } catch (error) {
        return next(error);
    }
};

const updateNotification = async (req, res, next) => {
    try {
        const { notification_id } = req.params;
        const { is_read, user_id: bodyUserId } = req.body;
        const user_id = bodyUserId || req.user?.user_id;

        if (!notification_id || is_read === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let updatedNotification;

        if (user_id) {
            const isFacilityAlert = notification_id.startsWith('cdss-') || notification_id.startsWith('ref-') || notification_id.startsWith('app-');
            updatedNotification = await prisma.notification.upsert({
                where: { notification_id: notification_id },
                create: {
                    notification_id: notification_id,
                    user_id: user_id,
                    notification_type: isFacilityAlert ? 'facility_read_receipt' : 'facility',
                    notification_message: isFacilityAlert ? 'Read receipt' : 'Alert',
                    is_read: Boolean(is_read),
                    notification_date: new Date()
                },
                update: {
                    is_read: Boolean(is_read)
                }
            });
        } else {
            const existingNotification = await prisma.notification.findUnique({
                where: { notification_id: notification_id }
            });

            if (existingNotification) {
                updatedNotification = await prisma.notification.update({
                    where: { notification_id: notification_id },
                    data: { is_read: Boolean(is_read) }
                });
            } else {
                updatedNotification = { notification_id, is_read: Boolean(is_read) };
            }
        }

        if (user_id) {
            const socketService = req.socketService || require('../../services/socketService');
            socketService.emitToUser(user_id, 'notification:updated', updatedNotification);
        }

        return res.status(200).json({
            message: "Notification updated",
            notification: updatedNotification
        });

    } catch (error) {
        return next(error);
    }
};

const getUnreadNotificationCount = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: "Missing user ID" });
        }

        if (!await validate.isUserExist(user_id)) {
            return res.status(404).json({ error: "User not found" });
        }

        const unreadCount = await prisma.notification.count({
            where: { user_id: user_id, is_read: false }
        });

        return res.status(200).json({
            message: "Unread notification count fetched",
            unreadCount: unreadCount
        });

    } catch (error) {
        return next(error);
    }
};

const markAllNotificationAsRead = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: "Missing user ID" });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: user_id },
            select: { user_id: true, facility_id: true, role: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await prisma.notification.updateMany({
            where: {
                user_id: user_id,
                is_read: false
            },
            data: {
                is_read: true
            }
        });

        if (user.facility_id && user.role !== 'Mother' && user.role !== 'MOTHER') {
            const [cdssAlerts, incomingReferrals, upcomingAppointments] = await Promise.all([
                prisma.cDSS_Alert.findMany({
                    where: {
                        is_resolved: false,
                        severity: { in: ['HIGH', 'High', 'high', 'CRITICAL', 'Critical', 'critical', 'CRITICAL_RISK'] },
                        pregnancy: { mother: { user: { facility_id: user.facility_id } } }
                    },
                    select: { alert_id: true }
                }),
                prisma.online_Referral.findMany({
                    where: { to_facility_id: user.facility_id, is_completed: false },
                    select: { referral_id: true }
                }),
                prisma.appointment.findMany({
                    where: { facility_id: user.facility_id, status: { in: ['scheduled', 'Scheduled', 'pending', 'Pending'] } },
                    select: { appointment_id: true }
                })
            ]);

            const facilityNotifIds = [
                ...cdssAlerts.map(a => `cdss-${a.alert_id}`),
                ...incomingReferrals.map(r => `ref-${r.referral_id}`),
                ...upcomingAppointments.map(app => `app-${app.appointment_id}`)
            ];

            for (const notifId of facilityNotifIds) {
                await prisma.notification.upsert({
                    where: { notification_id: notifId },
                    create: {
                        notification_id: notifId,
                        user_id: user_id,
                        notification_type: 'facility_read_receipt',
                        notification_message: 'Read receipt',
                        is_read: true,
                        notification_date: new Date()
                    },
                    update: {
                        is_read: true
                    }
                });
            }
        }

        const socketService = req.socketService || require('../../services/socketService');
        socketService.emitToUser(user_id, 'notification:read_all', { user_id });

        return res.status(200).json({ message: "All notifications marked as read" });

    } catch (error) {
        return next(error);
    }
};

const triggerDailyCheck = async (req, res, next) => {
    try {
        const cronSecret = process.env.CRON_SECRET || process.env.BYPASSCODE;
        const authHeader = req.headers['x-cron-secret'] || req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        if (!cronSecret || !token || token !== cronSecret) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Invalid or missing cron secret authorization header."
            });
        }

        console.log('[Cron] External trigger received for daily appointment alerts check...');
        const { scheduledSendAppointmentAlert } = require('../../services/AppointmentAlert');
        
        await scheduledSendAppointmentAlert(0);
        await scheduledSendAppointmentAlert(1);
        await scheduledSendAppointmentAlert(3);

        return res.status(200).json({
            success: true,
            message: "Daily appointment alerts check executed successfully."
        });
    } catch (error) {
        console.error('[Cron] Error executing daily check from endpoint:', error);
        return next(error);
    }
};

module.exports = {
    sendNotificationToUser,
    getNotificationByID,
    getAllNotificationByUser,
    deleteNotification,
    updateNotification,
    getUnreadNotificationCount,
    markAllNotificationAsRead,
    triggerDailyCheck
};