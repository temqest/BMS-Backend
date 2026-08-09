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

router.post('/send', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), sendNotificationToUser);

router.get('/get/:notification_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getNotificationByID);

router.get('/get/user/:user_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getAllNotificationByUser);

router.delete('/delete/:notification_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), deleteNotification);

router.put('/update/:notification_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), updateNotification);

router.get('/unread/count/:user_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getUnreadNotificationCount);

router.put('/mark/read/:user_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), markAllNotificationAsRead);

module.exports = router;