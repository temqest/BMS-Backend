const express = require('express');
const router = express.Router();
const { createImmunizationRecord, updateImmunizationRecord, deleteImmunizationRecord, getImmunizationRecordById, getImmunizationRecordByPregnancyId } = require('../controllers/immunizationController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const staffRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife'];

router.post('/register', verifyToken, checkUserRole(staffRoles), createImmunizationRecord);

router.put('/update/:immunization_id', verifyToken, checkUserRole(staffRoles), updateImmunizationRecord);

router.delete('/delete/:immunization_id', verifyToken, checkUserRole(staffRoles), deleteImmunizationRecord);

router.get('/get/:immunization_id', verifyToken, checkUserRole(staffRoles), getImmunizationRecordById);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(staffRoles), getImmunizationRecordByPregnancyId);

module.exports = router;
