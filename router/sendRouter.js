const otp = require('../controllers/otpController');
const send = require('../controllers/senderController');
const limit = require('../middleware/rateLimmiter');

const express = require('express');
const router = express.Router();

router.post('/generate', limit.otpLimiter, otp.requestOTP);

router.post('/verify', limit.otpLimiter, otp.validateOTP);

router.post('/send-email', send.sendEmail);

router.post('/send-sms', send.sendSMS);

module.exports = router;