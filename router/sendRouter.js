const otp = require('../controllers/otpController');
const send = require('../controllers/senderController');
const limit = require('../middleware/rateLimmiter');
const { verifyToken, checkUserRole } = require('../middleware/authMiddleware');

const express = require('express');
const router = express.Router();

const authorizedSendRoles = ['SystemAdmin', 'Admin', 'Doctor', 'HealthWorker', 'Nurse', 'Midwife', 'Staff'];

router.post('/generate', limit.otpLimiter, otp.requestOTP);

router.post('/verify', limit.otpLimiter, otp.validateOTP);

router.post('/send-email', verifyToken, checkUserRole(authorizedSendRoles), send.sendEmail);

router.post('/send-sms', verifyToken, checkUserRole(authorizedSendRoles), send.sendSMS);

module.exports = router;