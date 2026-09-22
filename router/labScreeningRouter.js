const express = require('express');
const router = express.Router();
const {
    uploadLabFile,
    registerLabScreening, 
    updateLabScreening, 
    deleteLabScreening, 
    getLabScreeningById, 
    getLabScreeningByPregnancy, 
    getLabScreeningByVisit,
    getLabScreeningByMother
} = require('../controllers/labScreeningController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');
const { upload } = require('../util/storage');

const clinicalStaffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];
const writeRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];
const viewRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

router.post('/upload', verifyToken, checkUserRole(writeRoles), upload.single('file'), uploadLabFile);

router.post('/register', verifyToken, checkUserRole(writeRoles), registerLabScreening);

router.put('/update/:screening_id', verifyToken, checkUserRole(clinicalStaffRoles), updateLabScreening);

router.delete('/delete/:screening_id', verifyToken, checkUserRole(writeRoles), deleteLabScreening);

router.get('/get/:screening_id', verifyToken, checkUserRole(viewRoles), getLabScreeningById);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(viewRoles), getLabScreeningByPregnancy);

router.get('/get/visit/:visit_id', verifyToken, checkUserRole(viewRoles), getLabScreeningByVisit);

router.get('/get/mother/:mother_id', verifyToken, checkUserRole(viewRoles), getLabScreeningByMother);

module.exports = router;