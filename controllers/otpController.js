const otpService = require('../services/otpServices');

const requestOTP = async (req, res, next) => {
    
    try {

        const { identifier, type, purpose, provider } = req.body;

        if (!identifier || !type || !purpose || !provider) {
            throw new Error("Missing required fields");
        }

        const otpResponse = await otpService.generateOTP(identifier, type, purpose, provider);

        return res.status(200).json({
            message: "OTP Sent Successfully",
            data: otpResponse,
        });
    
    } catch (error) {
        return next(error);
    }
}

const validateOTP = async (req, res, next) => {

    try {

        const { identifier, code, purpose } = req.body;

        if (!identifier || !code || !purpose) {
            throw new Error("Missing required fields");
        }

        const isValid = await otpService.verifyOTP(identifier, code, purpose);

        if (!isValid) {
            return res.status(400).json({
                message: "Invalid or expired OTP code"
            });
        }

        return res.status(200).json({
            message: "OTP Verified Successfully",
            data: true,
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    requestOTP,
    validateOTP
}