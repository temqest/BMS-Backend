const express = require('express');
const router = express.Router();
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware');
const {registerPregnancy, updatePregnancy, deletePregnancy, getPregnancyByID} = require('../controllers/pregnancyController');

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), registerPregnancy);

router.put('/update/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), updatePregnancy);

router.delete('/delete/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), deletePregnancy);

router.get('/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Nurse', 'Midwife', 'health_worker']), getPregnancyByID);

module.exports = router;