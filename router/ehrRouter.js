const express = require('express');
const router = express.Router();
const {
    uploadEhrFile,
    registerEhrDocument,
    getAllEhrDocuments,
    deleteEhrDocument
} = require('../controllers/ehrController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');
const { upload } = require('../util/storage');

const clinicalStaffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife'];
const writeRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];
const viewRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/upload', verifyToken, checkUserRole(clinicalStaffRoles), upload.single('file'), uploadEhrFile);
router.post('/register', verifyToken, checkUserRole(clinicalStaffRoles), registerEhrDocument);
router.get('/getAll', verifyToken, checkUserRole(viewRoles), getAllEhrDocuments);
router.delete('/delete/:id', verifyToken, checkUserRole(writeRoles), deleteEhrDocument);

module.exports = router;
