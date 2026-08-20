const express = require('express');
const router = express.Router();
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');
const { registerFacility, searchFacility, updateFacility, deleteFacility, viewAllFacility, getFacilityById } = require('../controllers/facilityController');

const sysAdminOnly = ['SystemAdmin'];
const adminRoles = ['SystemAdmin', 'Admin'];

router.post('/register', verifyToken, checkUserRole(sysAdminOnly), registerFacility);

router.get('/search', searchFacility);

router.put('/update', verifyToken, checkUserRole(adminRoles), updateFacility);

router.delete('/delete', verifyToken, checkUserRole(sysAdminOnly), deleteFacility);

router.get('/getAll', verifyToken, checkUserRole(sysAdminOnly), viewAllFacility);

router.get('/:facility_id', verifyToken, getFacilityById);

module.exports = router;