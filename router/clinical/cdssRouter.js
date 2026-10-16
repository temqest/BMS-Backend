const express = require('express');
const router = express.Router();
const {
    evaluateVisitRisk,
    getAlertsByPregnancy,
    resolveAlert,
    getHighRiskProfilesByFacility,
} = require('../../controllers/clinical/cdssController');
const { overrideRiskLevel } = require('../../controllers/clinical/prenatalVisitController');
const { verifyToken, checkUserRole } = require('../../middleware/authMiddleware');

const allowedRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];

router.post('/evaluate/:visit_id', verifyToken, checkUserRole(allowedRoles), evaluateVisitRisk);
router.put('/override/:visit_id?', verifyToken, checkUserRole(allowedRoles), overrideRiskLevel);
router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(allowedRoles), getAlertsByPregnancy);
router.get('/facility/:facility_id/high-risk', verifyToken, checkUserRole(allowedRoles), getHighRiskProfilesByFacility);
router.put('/resolve/:alert_id', verifyToken, checkUserRole(allowedRoles), resolveAlert);

module.exports = router;
