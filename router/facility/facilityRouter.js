const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole } = require('../../middleware/authMiddleware');
const {
    registerFacility,
    publicRegisterFacility,
    getPublicFacilities,
    searchFacility,
    updateFacility,
    deleteFacility,
    viewAllFacility,
    getFacilityById
} = require('../../controllers/facility/facilityController');

const sysAdminOnly = ['SystemAdmin'];
const adminRoles = ['SystemAdmin', 'Admin'];

router.post('/register', verifyToken, checkUserRole(sysAdminOnly), registerFacility);

router.post('/public-register', publicRegisterFacility);

router.get('/public-list', getPublicFacilities);

router.get('/search', searchFacility);

router.put('/update', verifyToken, checkUserRole(adminRoles), updateFacility);

router.delete('/delete', verifyToken, checkUserRole(sysAdminOnly), deleteFacility);

router.get('/getAll', verifyToken, checkUserRole(sysAdminOnly), viewAllFacility);

router.get('/:facility_id', verifyToken, getFacilityById);

module.exports = router;