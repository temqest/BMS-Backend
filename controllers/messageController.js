const prisma = require('../util/db');
const validate = require('../util/validation');

const createMessage = async (req, res, next) => {
    try {
        const sender_id = req.user?.user_id || req.body.sender_id;
        let { receiver_id, message_type, message_content, message_date } = req.body;

        if (!sender_id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        if (!message_content) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const senderUser = await prisma.user.findUnique({
            where: { user_id: sender_id }
        });

        if (!senderUser) {
            return res.status(404).json({ error: "Sender Doesn't Exist" });
        }

        message_type = message_type || "text";
        message_date = message_date ? new Date(message_date) : new Date();

        if (!receiver_id) {
            if (!senderUser.facility_id) {
                return res.status(400).json({ error: "NOT_AFFILIATED", message: "You are not affiliated with any healthcare facility." });
            }

            const staffUser = await prisma.user.findFirst({
                where: {
                    facility_id: senderUser.facility_id,
                    role: { in: ['HealthWorker', 'Doctor', 'Nurse', 'Midwife', 'Staff', 'Admin'] },
                    is_active: true,
                }
            });
            if (staffUser) {
                receiver_id = staffUser.user_id;
            } else {
                return res.status(400).json({ error: "NOT_AFFILIATED", message: "No active healthcare staff found for your facility." });
            }
        }
        
        if (!(await validate.isUserExist(sender_id))) {
            return res.status(404).json({ error: "Sender Doesn't Exist" });
        }

        if (!(await validate.isUserExist(receiver_id))) {
            return res.status(404).json({ error: "Receiver Doesn't Exist" });
        }

        const newMessage = await prisma.in_App_Message.create({
            data: {
                sender_id: sender_id,
                receiver_id: receiver_id,
                message_type: message_type,
                message_content: message_content,
                message_date: message_date,
            }
        });

        return res.status(200).json({
            message: "Message Successfully Created",
            data: newMessage
        });

    } catch (error) {
        return next(error);
    }
};

const updateMessage = async (req, res, next) => {
    try {
        const { message_id, message_content } = req.body;

        if (!message_id || !message_content) {
            return res.status(400).json({ error: "Missing Required Fields!" });
        }

        if (!(await validate.isMessageExist(message_id))) {
            return res.status(404).json({ error: "Message Doesn't Exist!" });
        }

        const updatedMessage = await prisma.in_App_Message.update({
            where: { message_id: message_id },
            data: {
                message_content: message_content
            }
        });

        return res.status(200).json({
            message: "Message Successfully Updated",
            data: updatedMessage
        });

    } catch (error) {
        return next(error);
    }
};

const deleteMessage = async (req, res, next) => {
    try {
        const { message_id } = req.body;

        if (!message_id) {
            return res.status(400).json({ error: "Missing Message_ID!" });
        }

        if (!(await validate.isMessageExist(message_id))) {
            return res.status(404).json({ error: "Message Doesn't Exist!" });
        }

        await prisma.in_App_Message.delete({
            where: { message_id: message_id }
        });

        return res.status(200).json({
            message: "Message Deleted Successfully"
        });

    } catch (error) {
        return next(error);
    }
};

const markMessageAsRead = async (req, res, next) => {
    try {
        const { message_id } = req.body;

        if (!message_id) {
            return res.status(400).json({ error: "Missing Message_ID!" });
        }

        if (!(await validate.isMessageExist(message_id))) {
            return res.status(404).json({ error: "Message Doesn't Exist!" });
        }

        const markAsRead = await prisma.in_App_Message.update({
            where: { message_id: message_id },
            data: {
                is_read: true
            }
        });

        return res.status(200).json({
            message: "Message Marked as Read",
            data: markAsRead
        });
    } catch (error) {
        return next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const { receiver_id, sender_id } = req.body;
        const current_user_id = req.user?.user_id;

        if (!receiver_id && !sender_id && !current_user_id) {
            return res.status(400).json({ error: "Missing Target User IDs!" });
        }

        let whereClause = { is_read: false };
        if (sender_id && receiver_id) {
            whereClause.sender_id = sender_id;
            whereClause.receiver_id = receiver_id;
        } else if (sender_id) {
            whereClause.sender_id = sender_id;
        } else if (receiver_id) {
            whereClause.receiver_id = receiver_id;
        } else if (current_user_id) {
            whereClause.receiver_id = current_user_id;
        }

        const markAsRead = await prisma.in_App_Message.updateMany({
            where: whereClause,
            data: {
                is_read: true
            }
        });

        return res.status(200).json({
            message: "Messages Marked as Read",
            data: markAsRead
        });
    } catch (error) {
        return next(error);
    }
};

const getAllMessageForUser = async (req, res, next) => {
    try {
        const user_id = req.params?.user_id || req.query?.user_id || req.user?.user_id || req.body?.user_id;

        if (!user_id) {
            return res.status(400).json({ error: "Missing User_ID!" });
        }

        const currentUser = await prisma.user.findUnique({
            where: { user_id }
        });

        if (!currentUser) {
            return res.status(404).json({ error: "User Doesn't Exist!" });
        }

        let whereClause;
        if (currentUser.role === 'SystemAdmin') {
            whereClause = {};
        } else if (currentUser.role !== 'Mother' && currentUser.facility_id) {
            // For healthcare facility staff, include messages involving any staff member in this facility
            // so the entire facility care team has access to patient conversations
            const facilityStaff = await prisma.user.findMany({
                where: {
                    facility_id: currentUser.facility_id,
                    role: { notIn: ['Mother', 'MOTHER'] }
                },
                select: { user_id: true }
            });
            const staffUserIds = Array.from(new Set([user_id, ...facilityStaff.map(s => s.user_id)]));

            whereClause = {
                OR: [
                    { sender_id: { in: staffUserIds } },
                    { receiver_id: { in: staffUserIds } },
                ]
            };
        } else {
            whereClause = {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id },
                ]
            };
        }

        const allMessages = await prisma.in_App_Message.findMany({
            where: whereClause,
            include: {
                sender: { select: { user_id: true, first_name: true, last_name: true, role: true, profile_url: true, facility_id: true } },
                receiver: { select: { user_id: true, first_name: true, last_name: true, role: true, profile_url: true, facility_id: true } },
            },
            orderBy: {
                message_date: 'asc'
            }
        });

        let contactUser = null;
        if (currentUser.role === 'Mother') {
            if (allMessages.length > 0) {
                const staffMsg = allMessages.slice().reverse().find(m => m.sender?.role !== 'Mother' || m.receiver?.role !== 'Mother');
                if (staffMsg) {
                    contactUser = staffMsg.sender?.role !== 'Mother' ? staffMsg.sender : staffMsg.receiver;
                }
            }

            if (!contactUser && currentUser.facility_id) {
                contactUser = await prisma.user.findFirst({
                    where: {
                        facility_id: currentUser.facility_id,
                        role: { in: ['HealthWorker', 'Doctor', 'Nurse', 'Midwife', 'Staff', 'Admin'] },
                        is_active: true,
                    },
                    select: { user_id: true, first_name: true, last_name: true, role: true, profile_url: true }
                });
            }
        }

        const hasFacility = Boolean(currentUser.facility_id);

        return res.status(200).json({
            message: "Messages Successfully Retrieved",
            data: allMessages,
            contact: contactUser,
            hasFacility: hasFacility
        });

    } catch (error) {
        return next(error);
    }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const user_id = req.params?.user_id || req.query?.user_id || req.user?.user_id || req.body?.user_id;

        if (!user_id) {
            return res.status(400).json({ error: "Missing User_ID" });
        }

        const currentUser = await prisma.user.findUnique({
            where: { user_id }
        });

        if (!currentUser) {
            return res.status(404).json({ error: "User Doesn't Exist" });
        }

        let whereClause = { receiver_id: user_id, is_read: false };
        if (currentUser.role !== 'Mother' && currentUser.facility_id) {
            const facilityStaff = await prisma.user.findMany({
                where: {
                    facility_id: currentUser.facility_id,
                    role: { notIn: ['Mother', 'MOTHER'] }
                },
                select: { user_id: true }
            });
            const staffUserIds = Array.from(new Set([user_id, ...facilityStaff.map(s => s.user_id)]));
            whereClause = {
                receiver_id: { in: staffUserIds },
                is_read: false
            };
        }

        const count = await prisma.in_App_Message.count({
            where: whereClause
        });

        return res.status(200).json({
            message: "Unread Count Successfully Retrieved",
            data: count
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createMessage,
    updateMessage,
    deleteMessage,
    getAllMessageForUser,
    markAllAsRead,
    markMessageAsRead,
    getUnreadCount
};