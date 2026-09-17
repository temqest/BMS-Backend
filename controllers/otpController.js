const otpService = require('../services/otpServices');

const requestOTP = async (req, res, next) => {
    try {
        const { identifier, type, purpose, provider } = req.body;

        if (!identifier || !type || !purpose || !provider) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const optResponse = await otpService.generateOTP(identifier, type, purpose, provider);

        return res.status(200).json({
            message: "OTP sent successfully",
            data: optResponse,
        });

    } catch (error) {
        console.error("[OTP Request Error]:", error.message);

        return res.status(400).json({
            error: "FailedToSendOTP",
            message: error.message || "Failed to send verification code. Please try again.",
        });
    }
};

const validateOTP = async (req, res, next) => {
    try {
        const { identifier, code, purpose } = req.body;

        if (!identifier || !code || !purpose) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const optResponse = await otpService.verifyOTP(identifier, code, purpose);

        if (!optResponse) {
            return res.status(400).json({ error: "Invalid or expired OTP code" });
        }

        return res.status(200).json({
            message: "OTP verified successfully",
            data: optResponse,
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    requestOTP,
    validateOTP
};