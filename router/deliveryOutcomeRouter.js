const express = require('express');
const router = express.Router();
const {
    registerDeliveryOutcome,
    updateDeliveryOutcome,
    deleteDeliveryOutcome,
    getDeliveryOutcomeById,
    getDeliveryOutcomeByPregnancy
} = require('../controllers/deliveryOutcomeController');
const {verifyToken, checkUserRole} = require('../middleware/authMiddleware');

router.post('/register', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), registerDeliveryOutcome);

router.put('/update/:delivery_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), updateDeliveryOutcome);

router.delete('/delete/:delivery_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), deleteDeliveryOutcome);

router.get('/get/:delivery_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getDeliveryOutcomeById);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(['SystemAdmin', 'Admin', 'Midwife', 'Nurse', 'HealthWorker', 'Mother']), getDeliveryOutcomeByPregnancy);

module.exports = router;
