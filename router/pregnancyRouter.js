const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');
const { registerPregnancy, updatePregnancy, deletePregnancy, getPregnancyByID, getAllPreganciesByMother } = require('../controllers/pregnancyController');

const staffRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife'];

router.post('/register', verifyToken, checkUserRole(staffRoles), registerPregnancy);

router.put('/update/:pregnancy_id', verifyToken, checkUserRole(staffRoles), updatePregnancy);

router.delete('/delete/:pregnancy_id', verifyToken, checkUserRole(staffRoles), deletePregnancy);

router.get('/:pregnancy_id', verifyToken, checkUserRole(staffRoles), getPregnancyByID);

router.get('/mother/:mother_id', verifyToken, checkUserRole(staffRoles), getAllPreganciesByMother);

module.exports = router;