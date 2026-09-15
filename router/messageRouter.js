const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');
const { upload } = require('../util/storage');

const allowedRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

router.post('/create', verifyToken, checkUserRole(allowedRoles), messageController.createMessage);

router.post('/upload', verifyToken, checkUserRole(allowedRoles), upload.single('file'), messageController.uploadAttachment);

router.put('/update', verifyToken, checkUserRole(allowedRoles), messageController.updateMessage);

router.delete('/delete', verifyToken, checkUserRole(allowedRoles), messageController.deleteMessage);

router.put('/markAsRead', verifyToken, checkUserRole(allowedRoles), messageController.markMessageAsRead);

router.put('/markAllAsRead', verifyToken, checkUserRole(allowedRoles), messageController.markAllAsRead);

router.get('/getAll', verifyToken, checkUserRole(allowedRoles), messageController.getAllMessageForUser);

router.get('/getUnreadCount', verifyToken, checkUserRole(allowedRoles), messageController.getUnreadCount);

module.exports = router;