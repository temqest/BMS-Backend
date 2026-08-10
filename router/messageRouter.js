const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/create', verifyToken, checkUserRole(allowedRoles), messageController.createMessage);

router.put('/update', verifyToken, checkUserRole(allowedRoles), messageController.updateMessage);

router.delete('/delete', verifyToken, checkUserRole(allowedRoles), messageController.deleteMessage);

router.put('/markAsRead', verifyToken, checkUserRole(allowedRoles), messageController.markMessageAsRead);

router.put('/markAllAsRead', verifyToken, checkUserRole(allowedRoles), messageController.markAllAsRead);

router.get('/getAll', verifyToken, checkUserRole(allowedRoles), messageController.getAllMessageForUser);

router.get('/getUnreadCount', verifyToken, checkUserRole(allowedRoles), messageController.getUnreadCount);

module.exports = router;