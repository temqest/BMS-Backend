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

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/upload', verifyToken, checkUserRole(allowedRoles), upload.single('file'), uploadLabFile);

router.post('/register', verifyToken, checkUserRole(allowedRoles), registerLabScreening);

router.put('/update/:screening_id', verifyToken, checkUserRole(allowedRoles), updateLabScreening);

router.delete('/delete/:screening_id', verifyToken, checkUserRole(allowedRoles), deleteLabScreening);

router.get('/get/:screening_id', verifyToken, checkUserRole(allowedRoles), getLabScreeningById);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(allowedRoles), getLabScreeningByPregnancy);

router.get('/get/visit/:visit_id', verifyToken, checkUserRole(allowedRoles), getLabScreeningByVisit);

router.get('/get/mother/:mother_id', verifyToken, checkUserRole(allowedRoles), getLabScreeningByMother);

module.exports = router;