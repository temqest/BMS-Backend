const express = require('express');
const router = express.Router();
const {
    registerPostpartumVisit,
    updatePostpartumVisit,
    deletePostpartumVisit,
    getPostpartumVisitById,
    getPostpartumVisitByDelivery
} = require('../controllers/postpartumVisitController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const clinicalStaffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];
const viewRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff', 'Mother'];

router.post('/register', verifyToken, checkUserRole(clinicalStaffRoles), registerPostpartumVisit);

router.put('/update/:postpartum_visit_id', verifyToken, checkUserRole(clinicalStaffRoles), updatePostpartumVisit);

router.delete('/delete/:postpartum_visit_id', verifyToken, checkUserRole(clinicalStaffRoles), deletePostpartumVisit);

router.get('/get/:postpartum_visit_id', verifyToken, checkUserRole(viewRoles), getPostpartumVisitById);

router.get('/get/delivery/:delivery_id', verifyToken, checkUserRole(viewRoles), getPostpartumVisitByDelivery);

module.exports = router;
