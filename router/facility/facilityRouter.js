const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole, ensureFacilityAccess } = require('../../middleware/authMiddleware');
const {
    registerFacility,
    publicRegisterFacility,
    getPublicFacilities,
    searchFacility,
    updateFacility,
    deleteFacility,
    viewAllFacility,
    getFacilityById,
    getFacilityHubDetails,
    reassignStaffFacility,
    reassignMotherFacility,
    getMunicipalOverview,
    getMunicipalReports,
    getDatabaseMaintenanceStats,
    checkDuplicateMothers,
} = require('../../controllers/facility/facilityController');

const sysAdminOnly = ['SystemAdmin', 'SuperAdmin'];
const adminRoles = ['SystemAdmin', 'SuperAdmin', 'Admin'];

router.get('/overview', verifyToken, checkUserRole(sysAdminOnly), getMunicipalOverview);
router.get('/municipal-reports', verifyToken, checkUserRole(sysAdminOnly), getMunicipalReports);
router.get('/database-stats', verifyToken, checkUserRole(sysAdminOnly), getDatabaseMaintenanceStats);
router.get('/check-duplicates', verifyToken, checkUserRole(sysAdminOnly), checkDuplicateMothers);

router.post('/register', verifyToken, checkUserRole(sysAdminOnly), registerFacility);

router.post('/public-register', publicRegisterFacility);

router.get('/public-list', getPublicFacilities);

router.get('/search', searchFacility);

router.put('/update', verifyToken, checkUserRole(adminRoles), updateFacility);

router.delete('/delete', verifyToken, checkUserRole(sysAdminOnly), deleteFacility);
router.delete('/delete/:facility_id', verifyToken, checkUserRole(sysAdminOnly), deleteFacility);
router.delete('/:facility_id', verifyToken, checkUserRole(sysAdminOnly), deleteFacility);

router.get('/getAll', verifyToken, checkUserRole(sysAdminOnly), viewAllFacility);

router.get('/:facility_id/hub', verifyToken, checkUserRole(adminRoles), getFacilityHubDetails);
router.put('/:facility_id/reassign-staff', verifyToken, checkUserRole(sysAdminOnly), reassignStaffFacility);
router.put('/:facility_id/reassign-mother', verifyToken, checkUserRole(sysAdminOnly), reassignMotherFacility);
router.put('/reassign-mother', verifyToken, checkUserRole(sysAdminOnly), reassignMotherFacility);

router.get('/:facility_id', verifyToken, ensureFacilityAccess('facility_id'), getFacilityById);

module.exports = router;
