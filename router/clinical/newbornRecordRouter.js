const express = require('express');
const router = express.Router();
const {
    registerNewbornRecord,
    updateNewbornRecord,
    deleteNewbornRecord,
    getNewbornRecordById,
    getNewbornRecordByDelivery
} = require('../../controllers/clinical/newbornRecordController');
const { verifyToken, checkUserRole } = require('../../middleware/authMiddleware');

const clinicalStaffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];
const viewRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

router.post('/register', verifyToken, checkUserRole(clinicalStaffRoles), registerNewbornRecord);

router.put('/update/:newborn_id', verifyToken, checkUserRole(clinicalStaffRoles), updateNewbornRecord);

router.delete('/delete/:newborn_id', verifyToken, checkUserRole(clinicalStaffRoles), deleteNewbornRecord);

router.get('/get/:newborn_id', verifyToken, checkUserRole(viewRoles), getNewbornRecordById);

router.get('/get/delivery/:delivery_id', verifyToken, checkUserRole(viewRoles), getNewbornRecordByDelivery);

module.exports = router;
