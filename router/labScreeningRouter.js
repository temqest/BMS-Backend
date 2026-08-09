const express = require('express');
const router = express.Router();
const {
    registerLabScreening, 
    updateLabScreening, 
    deleteLabScreening, 
    getLabScreeningById, 
    getLabScreeningByPregnancy, 
    getLabScreeningByVisit
} = require('../controllers/labScreeningController');
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware');


router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), registerLabScreening);

router.put('/update/:screening_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), updateLabScreening);

router.delete('/delete/:screening_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), deleteLabScreening);

router.get('/get/:screening_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getLabScreeningById);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getLabScreeningByPregnancy);

router.get('/get/visit/:visit_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getLabScreeningByVisit);

module.exports = router;