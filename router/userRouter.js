const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getStaffByFacility,
    getStaffById,
    updateStaffRole,
    deactivateStaff
} = require('../controllers/userController');

router.get('/facility', verifyToken, getStaffByFacility);
router.get('/:id', verifyToken, getStaffById);
router.put('/:id/role', verifyToken, updateStaffRole);
router.put('/:id/deactivate', verifyToken, deactivateStaff);

module.exports = router;
