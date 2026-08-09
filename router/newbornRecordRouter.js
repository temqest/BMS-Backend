const express = require('express');
const router = express.Router();
const {
    registerNewbornRecord,
    updateNewbornRecord,
    deleteNewbornRecord,
    getNewbornRecordById,
    getNewbornRecordByDelivery
} = require('../controllers/newbornRecordController');
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware');

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), registerNewbornRecord);

router.put('/update/:newborn_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), updateNewbornRecord);

router.delete('/delete/:newborn_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), deleteNewbornRecord);

router.get('/get/:newborn_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getNewbornRecordById);

router.get('/get/delivery/:delivery_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getNewbornRecordByDelivery);

module.exports = router;
