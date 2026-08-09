const express = require('express');
const router = express.Router();
const {
    registerPostpartumVisit,
    updatePostpartumVisit,
    deletePostpartumVisit,
    getPostpartumVisitById,
    getPostpartumVisitByDelivery
} = require('../controllers/postpartumVisitController');
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware');

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), registerPostpartumVisit);

router.put('/update/:postpartum_visit_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), updatePostpartumVisit);

router.delete('/delete/:postpartum_visit_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), deletePostpartumVisit);

router.get('/get/:postpartum_visit_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getPostpartumVisitById);

router.get('/get/delivery/:delivery_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getPostpartumVisitByDelivery);

module.exports = router;
