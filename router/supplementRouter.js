const express = require('express');
const router = express.Router();
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware');
const {registerSupplementRecord, updateSupplementRecord, deleteSupplementRecord, getSupplementRecordByID, getSupplementRecordByPregnancy, getSupplementRecordByHealthWorker} = require('../controllers/supplementController');

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'HealthWorker', 'Midwife']), registerSupplementRecord);

router.put('/update', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'HealthWorker', 'Midwife']), updateSupplementRecord);

router.delete('/delete/:supplement_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'HealthWorker', 'Midwife']), deleteSupplementRecord);

router.get('/get/:supplement_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'HealthWorker', 'Midwife', 'Mother']), getSupplementRecordByID);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'HealthWorker', 'Midwife', 'Mother']), getSupplementRecordByPregnancy);

router.get('/get/healthworker/:health_worker_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'HealthWorker', 'Midwife']), getSupplementRecordByHealthWorker);

module.exports = router;