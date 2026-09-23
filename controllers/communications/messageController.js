const prisma = require('../../util/db');
const validate = require('../../util/validation');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../../util/storage');

const createMessage = async (req, res, next) => {
    try {
        const sender_id = req.user?.user_id;
        let { receiver_id, message_type, message_content, message_date } = req.body;

        if (!sender_id) {
            return res.status(401).json({ error: "Unauthorized access, please login first" });
        }

        if (!message_content) {
            return res.status(400).json({ error: "Message content cannot be empty" });
        }

        const senderUser = await prisma.user.findUnique({
            where: { user_id: sender_id }
        });

        if (!senderUser) {
            return res.status(404).json({ error: "Sender profile not found" });
        }

        message_type = message_type || "text";
        message_date = message_date ? new Date(message_date) : new Date();

        if (senderUser.role === 'Mother') {
            const motherRecord = await prisma.mother.findUnique({
                where: { user_id: sender_id },
                include: { assignedWorker: true }
            });

            if (motherRecord?.assigned_worker_id) {
                receiver_id = motherRecord.assigned_worker_id;
            } else if (!receiver_id) {
                if (!senderUser.facility_id) {
                    return res.status(400).json({ error: "NOT_AFFILIATED", message: "You are not affiliated with any facility yet" });
                }

                const staffUser = await prisma.user.findFirst({
                    where: {
                        facility_id: senderUser.facility_id,
                        role: { in: ['Admin', 'HealthWorker', 'Doctor', 'Nurse', 'Midwife', 'Staff'] },
                        is_active: true,
                    }
                });

                if (staffUser) {
                    receiver_id = staffUser.user_id;
                } else {
                    return res.status(400).json({ error: "NOT_AFFILIATED", message: "No active staff members found for this facility" });
                }
            }
        } else if (senderUser.role !== 'SystemAdmin' && senderUser.role !== 'Admin') {
            if (receiver_id) {
                const receiverUser = await prisma.user.findUnique({
                    where: { user_id: receiver_id },
                    include: { mother: true }
                });

                if (receiverUser?.role === 'Mother' && receiverUser.mother) {
                    const motherRec = receiverUser.mother;
                    const isAssigned = motherRec.assigned_worker_id === sender_id || motherRec.created_by_id === sender_id;
                    if (!isAssigned) {
                        return res.status(403).json({ error: "Access denied. You can only message mothers assigned to your care." });
                    }
                }
            }
        } else if (!receiver_id) {
            if (!senderUser.facility_id) {
                return res.status(400).json({ error: "NOT_AFFILIATED", message: "You are not affiliated with any facility yet" });
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
                return res.status(400).json({ error: "NOT_AFFILIATED", message: "No active staff members found for this facility" });
            }
        }

        if (!(await validate.isUserExist(sender_id))) {
            return res.status(404).json({ error: "Sender profile not found" });
        }

        if (!(await validate.isUserExist(receiver_id))) {
            return res.status(404).json({ error: "Receiver profile not found" });
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
            message: "Message sent successfully",
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
            return res.status(400).json({ error: "Missing required fields" });
        }

        const existingMessage = await prisma.in_App_Message.findUnique({
            where: { message_id: message_id }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (req.user?.role !== 'SystemAdmin' && existingMessage.sender_id !== req.user?.user_id) {
            return res.status(403).json({ error: "Access denied. You can only edit your own messages" });
        }

        const updatedMessage = await prisma.in_App_Message.update({
            where: { message_id: message_id },
            data: {
                message_content: message_content
            }
        });

        return res.status(200).json({
            message: "Message updated successfully",
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
            return res.status(400).json({ error: "Missing message ID" });
        }

        const existingMessage = await prisma.in_App_Message.findUnique({
            where: { message_id: message_id }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (req.user?.role !== 'SystemAdmin' && existingMessage.sender_id !== req.user?.user_id) {
            return res.status(403).json({ error: "Access denied. You can only delete your own messages" });
        }

        await prisma.in_App_Message.delete({
            where: { message_id: message_id }
        });

        return res.status(200).json({
            message: "Message deleted"
        });

    } catch (error) {
        return next(error);
    }
};

const markMessageAsRead = async (req, res, next) => {
    try {
        const { message_id } = req.body;

        if (!message_id) {
            return res.status(400).json({ error: "Missing message ID" });
        }

        const existingMessage = await prisma.in_App_Message.findUnique({
            where: { message_id: message_id }
        });

        if (!existingMessage) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (req.user?.role !== 'SystemAdmin' && existingMessage.receiver_id !== req.user?.user_id) {
            return res.status(403).json({ error: "Access denied. You can only mark messages sent to you as read" });
        }

        const markAsRead = await prisma.in_App_Message.update({
            where: { message_id: message_id },
            data: {
                is_read: true
            }
        });

        return res.status(200).json({
            message: "Message marked as read",
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
            return res.status(400).json({ error: "Missing user ID" });
        }

        let whereClause = { is_read: false };

        if (sender_id && receiver_id) {
            whereClause.sender_id = sender_id;
            whereClause.receiver_id = receiver_id;
        } else if (sender_id) {
            whereClause.sender_id = sender_id;
            if (current_user_id) {
                whereClause.receiver_id = current_user_id;
            }
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
            message: "Messages marked as read",
            data: markAsRead
        });

    } catch (error) {
        return next(error);
    }
};

const getAllMessageForUser = async (req, res, next) => {
    try {
        const requestedUserId = req.params?.user_id || req.query?.user_id || req.body?.user_id;
        const user_id = (req.user?.role === 'SystemAdmin' && requestedUserId)
            ? requestedUserId
            : req.user?.user_id;

        if (!user_id) {
            return res.status(400).json({ error: "Missing user ID" });
        }

        const currentUser = await prisma.user.findUnique({
            where: { user_id }
        });

        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        let whereClause;

        if (currentUser.role === 'SystemAdmin') {
            whereClause = {};
        } else {
            whereClause = {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id },
                ]
            };
        }

        let allMessages = await prisma.in_App_Message.findMany({
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
            const motherRecord = await prisma.mother.findUnique({
                where: { user_id: user_id },
                include: {
                    assignedWorker: {
                        select: { user_id: true, first_name: true, last_name: true, role: true, profile_url: true }
                    }
                }
            });

            if (motherRecord?.assignedWorker) {
                contactUser = motherRecord.assignedWorker;
            } else if (allMessages.length > 0) {
                const staffMsg = allMessages.slice().reverse().find(m => m.sender?.role !== 'Mother' || m.receiver?.role !== 'Mother');
                if (staffMsg) {
                    contactUser = staffMsg.sender?.role !== 'Mother' ? staffMsg.sender : staffMsg.receiver;
                }
            }

            if (!contactUser && currentUser.facility_id) {
                contactUser = await prisma.user.findFirst({
                    where: {
                        facility_id: currentUser.facility_id,
                        role: { in: ['Admin', 'HealthWorker', 'Doctor', 'Nurse', 'Midwife', 'Staff'] },
                        is_active: true,
                    },
                    select: { user_id: true, first_name: true, last_name: true, role: true, profile_url: true }
                });
            }
        } else if (currentUser.role !== 'SystemAdmin' && currentUser.role !== 'Admin') {
            const myAssignedMothers = await prisma.mother.findMany({
                where: {
                    OR: [
                        { assigned_worker_id: user_id },
                        { created_by_id: user_id }
                    ]
                },
                select: { user_id: true }
            });
            const validMotherUserIds = new Set(myAssignedMothers.map(m => m.user_id).filter(Boolean));

            allMessages = allMessages.filter(msg => {
                const otherPartyRole = msg.sender_id === user_id ? msg.receiver?.role : msg.sender?.role;
                const otherPartyId = msg.sender_id === user_id ? msg.receiver_id : msg.sender_id;
                if (otherPartyRole === 'Mother') {
                    return validMotherUserIds.has(otherPartyId);
                }
                return true;
            });
        }

        const hasFacility = Boolean(currentUser.facility_id);

        return res.status(200).json({
            message: "Messages loaded successfully",
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
            return res.status(400).json({ error: "Missing user ID" });
        }

        const currentUser = await prisma.user.findUnique({
            where: { user_id }
        });

        if (!currentUser) {
            return res.status(404).json({ error: "User profile not found" });
        }

        const whereClause = { receiver_id: user_id, is_read: false };

        const count = await prisma.in_App_Message.count({
            where: whereClause
        });

        return res.status(200).json({
            message: "Unread count retrieved",
            data: count
        });

    } catch (error) {
        return next(error);
    }
};

const uploadAttachment = async (req, res, next) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded, please select a file" });
        }

        const fileExt = path.extname(file.originalname) || '';
        const fileName = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
        const isImage = (file.mimetype && file.mimetype.startsWith('image/')) || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname);
        const fileType = isImage ? 'image' : 'file';

        if (supabase) {
            try {
                const filePath = `messages/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype || 'application/octet-stream',
                        upsert: false
                    });

                if (!uploadError) {
                    const { data: signedData } = await supabase.storage.from('documents').createSignedUrl(filePath, 60 * 60 * 24 * 365);
                    const fileUrl = signedData?.signedUrl || (supabase.storage.from('documents').getPublicUrl(filePath)).data?.publicUrl;

                    if (fileUrl) {
                        return res.status(200).json({
                            fileUrl: fileUrl,
                            file_url: fileUrl,
                            fileName: file.originalname,
                            fileType: fileType,
                            fileSize: `${(file.size / 1024).toFixed(1)} KB`
                        });
                    }
                }
            } catch (supErr) {
                console.warn("Supabase storage upload failed:", supErr.message);
            }
        }

        const uploadsDir = path.join(__dirname, '../public/uploads');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const localFilePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(localFilePath, file.buffer);

        const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
        const file_url = `${baseUrl}/uploads/${fileName}`;

        return res.status(200).json({
            fileUrl: file_url,
            file_url: file_url,
            fileName: file.originalname,
            fileType: fileType,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`
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
    getUnreadCount,
    uploadAttachment
};