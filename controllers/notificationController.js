const prisma = require('../util/db');
const { isUserExist, isNotificationExist } = require('../util/validation');

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

        const {user_id} = req.params;

        if(!user_id) {
            return res.status(400).json({error : "Missing User ID!"});
        }

        if(!await validate.isUserExist(user_id)) {
            return res.status(404).json({error : "User not found!"});
        }

        const allNotification = await prisma.notification.findMany({
            where : {user_id : user_id},
            orderBy : {
                notification_date : "desc"
            }
        });

        return res.status(200).json({
            message : "Notifications Fetched Successfully!",
            notifications : allNotification
        });

    } catch (error) {
        return next(error);
    }
}

const deleteNotification = async (req, res, next) => {

    try {

        const {notification_id} = req.params;

        if(!notification_id) {
            return res.status(400).json({error : "Missing Notification ID!"});
        }

        if(!await validate.isNotificationExist(notification_id)) {
            return res.status(404).json({error : "Notification Doesn't Exist!"});
        }

        await prisma.notification.delete({
            where : {notification_id : notification_id}
        });

        return res.status(200).json({
            message : "Notification Deleted Successfully!"
        });

    } catch (error) {
        return next(error);
    }
}

const updateNotification = async (req, res, next) => {

    try {

        const {notification_id} = req.params;
        const {is_read} = req.body;

        if(!notification_id || is_read === undefined) {
            return res.status(400).json({error : "Missing Required Fields!"});
        }

        const updateNotification = await prisma.notification.findUnique({
            where : {notification_id : notification_id}
        });

        if(!updateNotification) {
            return res.status(404).json({error : "Notification Doesn't Exist!"});
        }

        const updatedNotification = await prisma.notification.update({
            where : {notification_id : notification_id},
            data : {
                is_read : is_read
            }
        });

        return res.status(200).json({
            message : "Notification Updated Successfully!",
            notification : updatedNotification
        });

    } catch (error) {
        return next(error);
    }

};

const getUnreadNotificationCount = async (req, res, next) => {

    try {

        const {user_id} = req.params;

        if(!user_id) {
            return res.status(400).json({error : "Missing User ID!"});
        }

        if(!await validate.isUserExist(user_id)) {
            return res.status(404).json({error : "User doesn't Exist!"});
        }

        const unreadCount = await prisma.notification.count({
            where : {user_id : user_id, is_read : false}
        });

        return res.status(200).json({
            message : "Unread Notification Count Fetched Successfully!",
            unreadCount : unreadCount
        });

    } catch (error) {
        return next(error);
    }
}

const markAllNotificationAsRead = async (req, res, next) => {
    
    try {

        const {user_id} = req.params;

        if(!user_id) {
            return res.status(400).json({error : "Missing User ID!"});
        }

        if(!await validate.isUserExist(user_id)) {
            return res.status(404).json({error : "User doesn't Exist!"});
        }

       await prisma.notification.updateMany({
            where : {
                user_id : user_id,
                is_read : false
            },
            data : {
                is_read : true
            }
       });

       return res.status(200).json({message : "All Notification Marked as Read Successfully!"});
        
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    sendNotificationToUser,
    getNotificationByID,
    getAllNotificationByUser,
    deleteNotification,
    updateNotification,
    getUnreadNotificationCount,
    markAllNotificationAsRead
};