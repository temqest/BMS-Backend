const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getStaffByFacility,
    getStaffById,
    updateStaffRole,
    deactivateStaff,
    updateUserProfile,
    adminResetStaffPassword,
    getStaffActivities,
    savePushToken,
    updateStaffProfilePhoto
} = require('../controllers/userController');

router.post('/push-token', verifyToken, savePushToken);

router.put('/profile', verifyToken, updateUserProfile);

router.get('/facility', verifyToken, getStaffByFacility);

router.get('/:id/activities', verifyToken, getStaffActivities);

router.get('/:id', verifyToken, getStaffById);

router.put('/:id/profile-photo', verifyToken, updateStaffProfilePhoto);

router.put('/:id/role', verifyToken, updateStaffRole);

router.put('/:id/deactivate', verifyToken, deactivateStaff);

router.put('/:id/admin-reset-password', verifyToken, adminResetStaffPassword);

module.exports = router;
