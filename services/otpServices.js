const prisma = require('../util/db');
const validate = require('../util/validation');
const send = require('../services/sendProvider');
const { verify } = require('jsonwebtoken');

const generateOTP = async (identifier, type, purpose, provider = "email") => {

    try {
        const isTesting = process.env.TESTING?.trim() === 'true';
        const code = isTesting ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        if (!isTesting) {
            const isCodeExist = await prisma.otp.findFirst({
                where : {
                    code : code,
                    is_used : false
                }
            })

            if(isCodeExist) {
                return await generateOTP(identifier, type, purpose, provider)
            }

            const recentOTP = await prisma.otp.findFirst({
                where: {
                    identifier: identifier,
                    is_used: false,
                    created_at: {
                        gt: new Date(Date.now() - 60 * 1000)
                    }
                }
            });

            if (recentOTP) {
                throw new Error("Please wait 60 seconds before requesting another OTP.");
            }

            const hourlyCount = await prisma.otp.count({
                where: {
                    identifier: identifier,
                    created_at: {
                        gt: new Date(Date.now() - 60 * 60 * 1000)
                    }
                }
            });

            if (hourlyCount >= 5) {
                throw new Error("Maximum OTP limit reached for this hour. Please try again later.");
            }
        }

        if (isTesting) {
            console.log(`[OTP TESTING MODE] OTP generated as '123456' for identifier: ${identifier} (purpose: ${purpose})`);
        }

        const otpRecord = await prisma.otp.create({
            data : {
                identifier : identifier,
                code : code,
                type : type,
                purpose : purpose,
                provider : provider,
                expires_at : expiresAt,
            }
        })

        if (!isTesting) {
            if (provider === "email" || provider === "nodemailer") {
                await send.sendOTPviaEmail(identifier, code, type, purpose)
            }

            if (provider === "sms" || provider === "twilio") {
                await send.sendOTPviaSMS(identifier, code, type, purpose)
            }
        }
        
        return true

    } catch (error) {
        throw error;
    }
}

const verifyOTP = async (identifier, code, purpose) => {

    try {
        const isTesting = process.env.TESTING?.trim() === 'true';
        if (isTesting && String(code) === '123456') {
            console.log(`[OTP TESTING MODE] OTP verification accepted '123456' for identifier: ${identifier}`);
            return true;
        }

        if (code === "FIREBASE_VERIFIED" || code === "FIREBASE_SMS_VERIFIED") {
            return true;
        }

        const isValid = await prisma.otp.findFirst({
            where : {
                identifier : identifier,
                code : String(code),
                is_used : false,
                purpose : purpose,
                expires_at : {
                    gt : new Date()
                }
            }
        })

        if(isValid) {
            
            await prisma.otp.update({
                where : {otp_id : isValid.otp_id},
                data : {
                    is_used : true
                }
            })

            return true
        }

        return false;

    } catch (error) {
        throw error;
    }
}

module.exports = {
    generateOTP,
    verifyOTP
}
