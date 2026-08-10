const express = require('express');
const router = express.Router();
const {
    sendNotificationToUser,
    getNotificationByID,
    getAllNotificationByUser,
    deleteNotification,
    updateNotification,
    getUnreadNotificationCount,
    markAllNotificationAsRead
} = require('../controllers/notificationController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/send', verifyToken, checkUserRole(allowedRoles), sendNotificationToUser);

router.get('/get/:notification_id', verifyToken, checkUserRole(allowedRoles), getNotificationByID);

router.get('/get/user/:user_id', verifyToken, checkUserRole(allowedRoles), getAllNotificationByUser);

router.delete('/delete/:notification_id', verifyToken, checkUserRole(allowedRoles), deleteNotification);

router.put('/update/:notification_id', verifyToken, checkUserRole(allowedRoles), updateNotification);

router.get('/unread/count/:user_id', verifyToken, checkUserRole(allowedRoles), getUnreadNotificationCount);

router.put('/mark/read/:user_id', verifyToken, checkUserRole(allowedRoles), markAllNotificationAsRead);

module.exports = router;