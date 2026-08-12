
const { Resend } = require('resend');

async function sendOTPviaEmail(identifier, code, type, purpose) {

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    try {

        const {data, error} = await resend.emails.send({
            from: "Birth Monitoring System <mail.pkov.online>",
            to: [identifier],
            subject: `Your OTP Code for ${purpose.toUpperCase()}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Verification Code</h2>
                    <p>Hello,</p>
                    <p>Your verification code for <strong>${purpose}</strong> is:</p>
                    <h1 style="color: #2563eb; letter-spacing: 4px;">${code}</h1>
                    <p>This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend Email Error: ", error);
            throw new Error(error.message || "Failed to send OTP email");
        }

        return data;
        
    } catch (error) {
        throw error;
    }

}

async function sendEmail(identifier, message, subject = "Notification from Birth Monitoring System", options = {}) {

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    try {
        const { data, error } = await resend.emails.send({
            from: options.from || "Birth Monitoring System <mail.pkov.online>",
            to: Array.isArray(identifier) ? identifier : [identifier],
            subject: subject,
            html: options.html || `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #333;">
                    <div style="background-color: #2563eb; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">Birth Monitoring System</h2>
                    </div>
                    <div style="padding: 20px; background-color: #ffffff;">
                        <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                            ${message}
                        </p>
                    </div>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; font-size: 12px; color: #6b7280;">
                        <p>This is an automated message. Please do not reply directly to this email.</p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error("Resend Email Error: ", error);
            throw new Error(error.message || "Failed to send email");
        }

        return data;

    } catch (error) {
        throw error;
    }

}

async function sendOTPviaSMS(identifier, code, type, purpose) {

    const SMS_API_KEY = process.env.SMS_API_TOKEN;

    try {

        const formattedPhone = String(identifier).replace(/[^0-9]/g, '');

        const response = await fetch('https://www.iprogsms.com/api/v1/sms_messages', {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                api_token: SMS_API_KEY,
                phone_number: formattedPhone,
                message: `Your verification code for ${purpose} is ${code}. Valid for 10 minutes. Do not share this code.`
            })
        });

        const data = await response.json();

        if (!response.ok || data.status !== 200) {
            console.error("SMS Provider Error: ", data);
            throw new Error(data.message || "Failed to send SMS OTP");
        }

        return data;

    } catch (error) {
        throw error;
    }
    
}

async function sendSMS(identifier, message, purpose) {

    const SMS_API_KEY = process.env.SMS_API_TOKEN;

    try {
        const formattedPhone = String(identifier).replace(/[^0-9]/g, '');

        const formattedMessage = purpose 
            ? `[BMS - ${purpose.toUpperCase()}]: ${message}`
            : `[Birth Monitoring System]: ${message}`;

        const response = await fetch('https://www.iprogsms.com/api/v1/sms_messages', {
            method: "POST",
            headers: {
                "content-type": "application/json"
            }, 
            body: JSON.stringify({
                api_token: SMS_API_KEY,
                phone_number: formattedPhone,
                message: formattedMessage
            })
        });

        const data = await response.json();

        if (!response.ok || data.status !== 200) {
            console.error("SMS Provider Error: ", data);
            throw new Error(data.message || "Failed to send SMS");
        }

        return data;

    } catch (error) {
        throw error;
    }

}

module.exports = {
    sendEmail,
    sendOTPviaEmail,
    sendOTPviaSMS,
    sendSMS
}