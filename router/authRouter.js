const express = require('express');
const router = express.Router();
const { register, login, setupPassword, createStaff, changePassword } = require('../controllers/authController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

router.post('/register', register);

router.post('/login', login);

router.post('/setup-password', setupPassword);

router.post('/change-password', verifyToken, changePassword);

router.post(
    '/create-staff',
    verifyToken,
    checkUserRole(['SystemAdmin', 'Doctor', 'Nurse', 'Midwife', 'Staff']),
    createStaff
);

module.exports = router;

