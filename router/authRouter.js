const express = require('express');
const router = express.Router();
const { register, login, createStaff } = require('../controllers/authController');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

router.post('/register', register);

router.post('/login', login);

router.post(
    '/create-staff',
    verifyToken,
    checkUserRole(['SystemAdmin', 'Doctor', 'Nurse', 'Midwife', 'Staff']),
    createStaff
);

module.exports = router;

