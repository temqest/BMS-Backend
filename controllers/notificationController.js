const prisma = require('../util/db');
const validate = require('../util/validation');

const sendNotificationToUser = async (req, res, next) => {

    try {

        const {user_id, notification_type, notification_message, notification_date} = req.body;

        if(!user_id || !notification_type || !notification_message) {
            return res.status(400).json({error : "Missing Required Fields!"});
        }

        if(!await validate.isUserExist(user_id)) {
            return res.status(404).json({error : "User not found!"});
        }

        const newNotification = await prisma.notification.create({
            data : {
                user_id : user_id,
                notification_type : notification_type,
                notification_message : notification_message,
                notification_date : notification_date ? new Date(notification_date) : undefined
            }
        });

        return res.status(200).json({
            message : "Notification Sent Successfully!",
            notification : newNotification
        });

    } catch (error) {
        return next(error);
    }
}

const getNotificationByID = async (req, res, next) => {

    try {

        const {notification_id} = req.params;

        if(!notification_id) {
            return res.status(400).json({error : "Missing Notification ID!"});
        }

        if(!await validate.isNotificationExist(notification_id)) {
            return res.status(404).json({error : "Notification Doesn't Exist!"});
        }

        const notification = await prisma.notification.findUnique({
            where : {notification_id : notification_id},
            include : {
                user : {
                    select : {
                        name : true,
                        email : true,
                        user_type : true
                    }
                }
            }
        });

        return res.status(200).json({
            message : "Notification Fetched Successfully!",
            notification : notification
        });

    } catch (error) {
        return next(error);
    }
}

const getAllNotificationByUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: "Missing User ID!" });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: user_id },
            select: {
                user_id: true,
                role: true,
                facility_id: true,
                first_name: true,
                last_name: true,
                facility: {
                    select: {
                        facility_id: true,
                        facility_name: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found!" });
        }

        // 1. Direct user-targeted notifications
        const directNotifications = await prisma.notification.findMany({
            where: { user_id: user_id },
            orderBy: { notification_date: "desc" }
        });

        const formattedDirect = directNotifications.map(n => ({
            ...n,
            sender: n.notification_type === 'vitals' ? 'Clinical Alert'
                  : n.notification_type === 'referral' ? 'Referral Service'
                  : n.notification_type === 'appointment' ? 'Appointment Service'
                  : n.notification_type === 'team' ? 'Team Management'
                  : 'System Alert',
            category: n.notification_type || 'system'
        }));

        let facilityAlerts = [];

        // 2. If user belongs to a facility and is staff, retrieve active facility alerts
        if (user.facility_id && user.role !== 'Mother' && user.role !== 'MOTHER') {
            const [cdssAlerts, incomingReferrals, upcomingAppointments] = await Promise.all([
                // A. Active High-Risk CDSS alerts in this facility
                prisma.cDSS_Alert.findMany({
                    where: {
                        is_resolved: false,
                        severity: { in: ['high', 'High', 'critical', 'Critical'] },
                        pregnancy: {
                            mother: {
                                user: {
                                    facility_id: user.facility_id
                                }
                            }
                        }
                    },
                    include: {
                        pregnancy: {
                            include: {
                                mother: {
                                    include: {
                                        user: {
                                            select: { first_name: true, last_name: true }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { updated_at: 'desc' },
                    take: 10
                }),

                // B. Active incoming referrals to this facility
                prisma.online_Referral.findMany({
                    where: {
                        to_facility_id: user.facility_id,
                        is_completed: false
                    },
                    include: {
                        fromFacility: { select: { facility_name: true } },
                        pregnancy: {
                            include: {
                                mother: {
                                    include: {
                                        user: { select: { first_name: true, last_name: true } }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { date_referred: 'desc' },
                    take: 10
                }),

                // C. Active appointments in this facility
                prisma.appointment.findMany({
                    where: {
                        facility_id: user.facility_id,
                        status: { in: ['scheduled', 'Scheduled', 'pending', 'Pending'] }
                    },
                    include: {
                        user: { select: { first_name: true, last_name: true } }
                    },
                    orderBy: { appointment_date: 'desc' },
                    take: 10
                })
            ]);

            const formattedCDSS = cdssAlerts.map(alert => {
                const motherUser = alert.pregnancy?.mother?.user;
                const patientName = motherUser ? `${motherUser.first_name || ''} ${motherUser.last_name || ''}`.trim() : 'Patient';
                const notifId = `cdss-${alert.alert_id}`;
                return {
                    notification_id: notifId,
                    user_id: user_id,
                    notification_type: 'vitals',
                    notification_message: `High-Risk CDSS Alert: ${alert.alert_type} detected for ${patientName} (${alert.alert_message})`,
                    notification_date: alert.updated_at,
                    is_read: readNotificationIds.has(notifId),
                    sender: 'Clinical CDSS System',
                    category: 'vitals',
                    link: '/dashboard/mothers'
                };
            });

            const formattedReferrals = incomingReferrals.map(ref => {
                const motherUser = ref.pregnancy?.mother?.user;
                const patientName = motherUser ? `${motherUser.first_name || ''} ${motherUser.last_name || ''}`.trim() : 'Patient';
                const fromFacilityName = ref.fromFacility?.facility_name || 'Partner Facility';
                const notifId = `ref-${ref.referral_id}`;
                return {
                    notification_id: notifId,
                    user_id: user_id,
                    notification_type: 'referral',
                    notification_message: `Incoming Referral: ${fromFacilityName} referred patient ${patientName} (${ref.reason || 'Maternal Case'}). Status: ${ref.status}`,
                    notification_date: ref.date_referred,
                    is_read: readNotificationIds.has(notifId) || ref.status === 'accepted' || ref.status === 'completed',
                    sender: fromFacilityName,
                    category: 'referral',
                    link: '/dashboard/referrals'
                };
            });

            const formattedAppointments = upcomingAppointments.map(app => {
                const patientName = app.user ? `${app.user.first_name || ''} ${app.user.last_name || ''}`.trim() : 'Patient';
                const appDateStr = new Date(app.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const notifId = `app-${app.appointment_id}`;
                return {
                    notification_id: notifId,
                    user_id: user_id,
                    notification_type: 'appointment',
                    notification_message: `Upcoming Appointment: ${app.appointment_type} for ${patientName} on ${appDateStr} at ${app.appointment_time}`,
                    notification_date: app.updated_at || app.appointment_date,
                    is_read: readNotificationIds.has(notifId),
                    sender: 'Appointment Service',
                    category: 'appointment',
                    link: '/dashboard/appointments'
                };
            });

            facilityAlerts = [...formattedCDSS, ...formattedReferrals, ...formattedAppointments];
        }

        // Combine direct and facility alerts, sort descending by date
        const combined = [...formattedDirect, ...facilityAlerts];
        combined.sort((a, b) => new Date(b.notification_date).getTime() - new Date(a.notification_date).getTime());

        return res.status(200).json({
            message: "Notifications Fetched Successfully!",
            notifications: combined
        });

    } catch (error) {
        return next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const { notification_id } = req.params;

        if (!notification_id) {
            return res.status(400).json({ error: "Missing Notification ID!" });
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
            message: "Notification Deleted Successfully!"
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
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        let updatedNotification;
        if (user_id) {
            updatedNotification = await prisma.notification.upsert({
                where: { notification_id: notification_id },
                create: {
                    notification_id: notification_id,
                    user_id: user_id,
                    notification_type: 'facility',
                    notification_message: 'Alert',
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

        return res.status(200).json({
            message: "Notification Updated Successfully!",
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
            return res.status(400).json({ error: "Missing User ID!" });
        }

        if (!await validate.isUserExist(user_id)) {
            return res.status(404).json({ error: "User doesn't Exist!" });
        }

        const unreadCount = await prisma.notification.count({
            where: { user_id: user_id, is_read: false }
        });

        return res.status(200).json({
            message: "Unread Notification Count Fetched Successfully!",
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
            return res.status(400).json({ error: "Missing User ID!" });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: user_id },
            select: { user_id: true, facility_id: true, role: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User doesn't Exist!" });
        }

        // 1. Mark all existing direct notifications as read
        await prisma.notification.updateMany({
            where: {
                user_id: user_id,
                is_read: false
            },
            data: {
                is_read: true
            }
        });

        // 2. If staff member with facility, also mark active facility alerts as read
        if (user.facility_id && user.role !== 'Mother' && user.role !== 'MOTHER') {
            const [cdssAlerts, incomingReferrals, upcomingAppointments] = await Promise.all([
                prisma.cDSS_Alert.findMany({
                    where: {
                        is_resolved: false,
                        severity: { in: ['high', 'High', 'critical', 'Critical'] },
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
                        notification_type: 'facility',
                        notification_message: 'Alert',
                        is_read: true,
                        notification_date: new Date()
                    },
                    update: {
                        is_read: true
                    }
                });
            }
        }

        return res.status(200).json({ message: "All Notification Marked as Read Successfully!" });
        
    } catch (error) {
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
    markAllNotificationAsRead
};