const express = require('express');
const router = express.Router();
const {
    createReferral,
    getAllReferrals,
    getReferralById,
    updateReferral,
    respondToReferral,
    getReferralByFacility,
    getAllReferralByPregnancy,
    deleteReferral,
} = require('../controllers/referralController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const allowedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Nurse', 'Midwife'];
const externalRoles = ['External-Hospital'];
const allRolesWithExternal = [...allowedRoles, ...externalRoles];

router.post('/register', verifyToken, checkUserRole(allowedRoles), createReferral);

router.put('/update/:referral_id', verifyToken, checkUserRole(allRolesWithExternal), updateReferral);

router.delete('/delete/:referral_id', verifyToken, checkUserRole(allowedRoles), deleteReferral);

router.put('/respond/:referral_id', verifyToken, checkUserRole(allRolesWithExternal), respondToReferral);

router.get('/get/:referral_id', verifyToken, checkUserRole(allRolesWithExternal), getReferralById);

router.get('/get/facility/:facility_id', verifyToken, checkUserRole(allRolesWithExternal), getReferralByFacility);

router.get('/get/pregnancy/:pregnancy_id', verifyToken, checkUserRole(allowedRoles), getAllReferralByPregnancy);

router.get('/getAll', verifyToken, checkUserRole(allowedRoles), getAllReferrals);

module.exports = router;
