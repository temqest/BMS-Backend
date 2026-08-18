const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');
const { registerSupplementRecord, updateSupplementRecord, deleteSupplementRecord, getSupplementRecordByID, getSupplementRecordByPregnancy, getSupplementRecordByHealthWorker, getSupplementRecordByMother } = require('../controllers/supplementController');

const staffRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife'];
const allUserRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/register', verifyToken, checkUserRole(staffRoles), registerSupplementRecord);

router.put('/update', verifyToken, checkUserRole(staffRoles), updateSupplementRecord);

router.delete('/delete/:supplement_id', verifyToken, checkUserRole(staffRoles), deleteSupplementRecord);

router.get('/get/:supplement_id', verifyToken, checkUserRole(allUserRoles), getSupplementRecordByID);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(allUserRoles), getSupplementRecordByPregnancy);

router.get('/get/healthworker/:health_worker_id', verifyToken, checkUserRole(staffRoles), getSupplementRecordByHealthWorker);

router.get('/get/mother/:mother_id', verifyToken, checkUserRole(allUserRoles), getSupplementRecordByMother);

module.exports = router;