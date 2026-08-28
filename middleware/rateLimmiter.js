
const rateLimit = require('express-rate-limit')

const otpLimiter = rateLimit({
    
    windowMs : 15 * 60 * 1000,
    max : 5,
    message : {
        status : 429,
        error : "Too many OTP Request from this IP, please try again after 15 minutes."
    },
    standardHeaders : true,
    legacyHeaders : false
})

const apiLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,
    max: 2000,
    message : {
        status : 429,
        error: "Too many request, please slow down."
    },
    standardHeaders : true,
    legacyHeaders : false
})

module.exports = {
    otpLimiter,
    apiLimiter
}