const express = require('express');
const router = express.Router();
const {
    evaluateVisitRisk,
    getAlertsByPregnancy,
    resolveAlert,
} = require('../controllers/cdssController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife'];

router.post('/evaluate/:visit_id', verifyToken, checkUserRole(allowedRoles), evaluateVisitRisk);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(allowedRoles), getAlertsByPregnancy);

router.put('/resolve/:alert_id', verifyToken, checkUserRole(allowedRoles), resolveAlert);

module.exports = router;
