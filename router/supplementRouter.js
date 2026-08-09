const express = require('express');
const router = express.Router();
const {authMiddleware, requireRole} = require('../middleware/authMiddleware');
const {registerSupplementRecord, updateSupplementRecord, deleteSupplementRecord, getSupplementRecordByID, getSupplementRecordByPregnancy, getSupplementRecordByHealthWorker} = require('../controllers/supplementController');

router.post('/register', authMiddleware, requireRole(['SystemAdmin', 'Admin', 'Nurse', 'health worker', 'midwife']), registerSupplementRecord);

router.put('/update', authMiddleware, requireRole(['SystemAdmin', 'Admin', 'Nurse', 'health worker', 'midwife']), updateSupplementRecord);

router.delete('/delete/:supplement_id', authMiddleware, requireRole(['SystemAdmin', 'Admin', 'Nurse', 'health worker', 'midwife']), deleteSupplementRecord);

router.get('/get/:supplement_id', authMiddleware, requireRole(['SystemAdmin', 'Admin', 'Nurse', 'health worker', 'midwife', 'mother']), getSupplementRecordByID);

router.get('/get/pregnancy/:pregnancy_id', authMiddleware, requireRole(['SystemAdmin', 'Admin', 'Nurse', 'health worker', 'midwife', 'mother']), getSupplementRecordByPregnancy);

router.get('/get/healthworker/:health_worker_id', authMiddleware, requireRole(['SystemAdmin', 'Admin', 'Nurse', 'health worker', 'midwife']), getSupplementRecordByHealthWorker);

module.exports = router;