const express = require('express');
const router = express.Router();
const {
    registerDeliveryOutcome,
    updateDeliveryOutcome,
    deleteDeliveryOutcome,
    getDeliveryOutcomeById,
    getDeliveryOutcomeByPregnancy
} = require('../controllers/deliveryOutcomeController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/register', verifyToken, checkUserRole(allowedRoles), registerDeliveryOutcome);

router.put('/update/:delivery_id', verifyToken, checkUserRole(allowedRoles), updateDeliveryOutcome);

router.delete('/delete/:delivery_id', verifyToken, checkUserRole(allowedRoles), deleteDeliveryOutcome);

router.get('/get/:delivery_id', verifyToken, checkUserRole(allowedRoles), getDeliveryOutcomeById);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(allowedRoles), getDeliveryOutcomeByPregnancy);

module.exports = router;
