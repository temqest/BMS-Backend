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

const clinicalStaffRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife'];
const viewRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Mother'];

router.post('/register', verifyToken, checkUserRole(clinicalStaffRoles), registerDeliveryOutcome);

router.put('/update/:delivery_id', verifyToken, checkUserRole(clinicalStaffRoles), updateDeliveryOutcome);

router.delete('/delete/:delivery_id', verifyToken, checkUserRole(clinicalStaffRoles), deleteDeliveryOutcome);

router.get('/get/:delivery_id', verifyToken, checkUserRole(viewRoles), getDeliveryOutcomeById);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(viewRoles), getDeliveryOutcomeByPregnancy);

module.exports = router;
