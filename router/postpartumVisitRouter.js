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

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/register', verifyToken, checkUserRole(allowedRoles), registerPostpartumVisit);

router.put('/update/:postpartum_visit_id', verifyToken, checkUserRole(allowedRoles), updatePostpartumVisit);

router.delete('/delete/:postpartum_visit_id', verifyToken, checkUserRole(allowedRoles), deletePostpartumVisit);

router.get('/get/:postpartum_visit_id', verifyToken, checkUserRole(allowedRoles), getPostpartumVisitById);

router.get('/get/delivery/:delivery_id', verifyToken, checkUserRole(allowedRoles), getPostpartumVisitByDelivery);

module.exports = router;
