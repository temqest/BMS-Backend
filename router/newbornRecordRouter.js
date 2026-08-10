const express = require('express');
const router = express.Router();
const {
    registerNewbornRecord,
    updateNewbornRecord,
    deleteNewbornRecord,
    getNewbornRecordById,
    getNewbornRecordByDelivery
} = require('../controllers/newbornRecordController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/register', verifyToken, checkUserRole(allowedRoles), registerNewbornRecord);

router.put('/update/:newborn_id', verifyToken, checkUserRole(allowedRoles), updateNewbornRecord);

router.delete('/delete/:newborn_id', verifyToken, checkUserRole(allowedRoles), deleteNewbornRecord);

router.get('/get/:newborn_id', verifyToken, checkUserRole(allowedRoles), getNewbornRecordById);

router.get('/get/delivery/:delivery_id', verifyToken, checkUserRole(allowedRoles), getNewbornRecordByDelivery);

module.exports = router;
