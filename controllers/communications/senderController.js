const send = require('../../services/sendProvider');
const validate = require('../../util/validation');

const sendEmail = async (req, res, next) => {
    try {
        const { email, message, subject = "Notification from Birth Monitoring System", options = {} } = req.body;

        if (!email || !message) {
            return res.status(400).json({ error: "Missing required fields, please check your input" });
        }

        const isRecipientExist = await validate.isEmailExist(email);

        if (!isRecipientExist) {
            return res.status(400).json({ error: "Could not deliver email to specified recipient." });
        }

        const response = await send.sendEmail(email, message, subject, options);

        return res.status(200).json({
            message: "Email sent successfully",
            data: response
        });

    } catch (error) {
        return next(error);
    }
};

const sendSMS = async (req, res, next) => {
    try {
        const { identifier, message, purpose } = req.body;

        if (!identifier || !message || !purpose) {
            return res.status(400).json({ error: "Missing required fields, please check your input" });
        }

        const isRecipientExist = await validate.isPhoneExist(identifier);

        if (!isRecipientExist) {
            return res.status(400).json({ error: "Could not deliver SMS to specified recipient." });
        }

        const response = await send.sendSMS(identifier, message, purpose);

        return res.status(200).json({
            message: "SMS sent successfully",
            data: response
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    sendEmail,
    sendSMS
};