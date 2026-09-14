const express = require('express');
const router = express.Router();
const { register, login, setupPassword, resetPassword, createStaff, changePassword, googleAuth } = require('../controllers/authController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

router.post('/register', register);

router.post('/login', login);

router.post('/google', googleAuth);

router.post('/setup-password', setupPassword);

router.post('/reset-password', resetPassword);

router.post('/change-password', verifyToken, changePassword);

router.post(
    '/create-staff',
    verifyToken,
    checkUserRole(['SystemAdmin', 'Admin', 'Doctor', 'Nurse', 'Midwife', 'HealthWorker', 'Staff']),
    createStaff
);

const { getStaffByFacility } = require('../controllers/userController');

router.get('/staff', verifyToken, getStaffByFacility);

module.exports = router;

