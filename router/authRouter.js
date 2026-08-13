const express = require('express');
const router = express.Router();
const { register, login, createStaff } = require('../controllers/authController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

// Public self-registration (Requires OTP)
router.post('/register', register);

// Public login
router.post('/login', login);

// Staff creation by Admin/Staff (No OTP required, protected by Bearer Token)
router.post(
    '/create-staff',
    verifyToken,
    checkUserRole(['SystemAdmin', 'Doctor', 'Nurse', 'Midwife', 'Staff']),
    createStaff
);

module.exports = router;

