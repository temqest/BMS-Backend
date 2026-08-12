const send = require('../services/sendProvider');
const validate = require('../util/validation');

const sendEmail = async (req, res, next) => {

    try {

        const {email, message, subject = "Notification from Birth Monitoring System", options = {}} = req.body;

        if(!email || !message) {
            return res.status(400).json({error : "Missing required fields"});
        }

        if(!(await validate.isEmailExist(email))) {
            return res.status(404).json({error : "Email doesn't Exist"});
        }

        const response = await send.sendEmail(email, message, subject, options) 

        return res.status(200).json({
            message : "Email sent successfully",
            data : response

        })

    } catch (error) {
        return next(error);
    }
}

const sendSMS = async (req, res, next) => {

    try {

        const {identifier, message, purpose} = req.body;

        if(!identifier || !message || !purpose) {
            return res.status(400).json({error : "Missing required fields"});
        }

        if (!(await validate.isPhoneExist(identifier))) {
            return res.status(404).json({ error: "Phone number doesn't exist" });
        }

        const response = await send.sendSMS(identifier, message, purpose);

        return res.status(200).json({
            message: "SMS sent successfully",
            data: response
        });

    } catch (error) {
        return next(error);
    }
}

module.exports = {
    sendEmail,
    sendSMS
}