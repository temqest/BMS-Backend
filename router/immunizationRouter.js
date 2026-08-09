const express =require('express')
const router  = express.Router()
const {createImmunizationRecord, updateImmunizationRecord, deleteImmunizationRecord, getImmunizationRecordById, getImmunizationRecordByPregnancyId} = require('../controllers/immunizationController')
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware')

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), createImmunizationRecord)

router.put('/update/:immunization_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), updateImmunizationRecord)

router.delete('/delete/:immunization_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), deleteImmunizationRecord)

router.get('/get/:immunization_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), getImmunizationRecordById)

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife']), getImmunizationRecordByPregnancyId)

module.exports = router;
