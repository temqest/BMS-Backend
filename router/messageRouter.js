const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/authMiddleware');

router.post('/create', auth.verifyToken, auth.checkUserRole(["SystemAdmin", "Admin", "HealthWorker", "Nurse", "Midwife", "Mother"]), messageController.createMessage)

router.put('/update', auth.verifyToken, auth.checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Midwife', "Nurse", 'Mother']), messageController.updateMessage)

router.delete('/delete', auth.verifyToken, auth.checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Midwife', 'Nurse', 'Mother']), messageController.deleteMessage)

router.put('/markAsRead', auth.verifyToken, auth.checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Midwife', 'Nurse', 'Mother']), messageController.markMessageAsRead)

router.put('/markAllAsRead', auth.verifyToken, auth.checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Midwife', 'Nurse', 'Mother']), messageController.markAllAsRead)

router.get('/getAll', auth.verifyToken, auth.checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Midwife', 'Nurse', 'Mother']), messageController.getAllMessageForUser)

router.get('/getUnreadCount', auth.verifyToken, auth.checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Midwife', 'Nurse', 'Mother']), messageController.getUnreadCount)

module.exports = router;