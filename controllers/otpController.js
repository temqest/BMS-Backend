const otpService = require('../services/otpServices');

const requestOTP = async (req, res, next) => {

    try {

        const { identifier, type, purpose, provider } = req.body;

        if (!identifier || !type || !purpose || !provider) {
            return res.status(400).json({ error: "Missing Required Fields" })
        }

        const optResponse = await otpService.generateOTP(identifier, type, purpose, provider)

        return res.status(200).json({
            message: "OTP Sent Successfully",
            data: optResponse,
        })

    } catch (error) {
        return next(error);
    }
}

const validateOTP = async (req, res, next) => {

    try {

        const { identifier, code, purpose } = req.body;

        if (!identifier || !code || !purpose) {
            return res.status(400).json({ error: "Missing Required Fields" })
        }

        const optResponse = await otpService.verifyOTP(identifier, code, purpose);

        return res.status(200).json({
            message: "OTP Verified Successfully",
            data: optResponse,
        })

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    requestOTP,
    validateOTP
}