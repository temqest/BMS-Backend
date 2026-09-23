require('dotenv').config();
const express = require('express')
const app = express()
const cors = require('cors');
const helmet = require('helmet');
const PORT = process.env.PORT || 6700

app.set('trust proxy', 1);

const authRouter = require('./router/authRouter');

const faciliityRouter = require('./router/facilityRouter');

const motherRouter = require('./router/motherRouter');
const shareRouter = require('./router/shareRouter');

const pregnancyRouter = require('./router/pregnancyRouter');

const prenatalVisitRouter = require('./router/prenatalVisitRouter')

const supplementRouter = require('./router/supplementRouter')

const labScreeningRouter = require('./router/labScreeningRouter');

const deliveryOutcomeRouter = require('./router/deliveryOutcomeRouter');

const newbornRecordRouter = require('./router/newbornRecordRouter');

const postpartumVisitRouter = require('./router/postpartumVisitRouter');

const notificationRouter = require('./router/notificationRouter');

const messageRouter = require('./router/messageRouter');

const auditTrailRouter = require('./router/auditTrailRouter');

const referralRouter = require('./router/referralRouter');

const cdssRouter = require('./router/cdssRouter');

const appointmentRouter = require('./router/appointmentRouter');

const { apiLimiter } = require('./middleware/rateLimmiter');

const sendRouter = require('./router/sendRouter');
const userRouter = require('./router/userRouter');
const ehrRouter = require('./router/ehrRouter');

const path = require('path');

const compression = require('compression');

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.SITE_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://localhost:8081',
    'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.endsWith('.online') ||
            /^http:\/\/localhost:\d+$/.test(origin)
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));

app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

app.get('/health', (req, res) => {
    res.send("Birth Monitoring System's Backend is working fine")
})

app.get('/api/v1/health', (req, res) => {
    res.send("Birth Monitoring System's Backend is working fine")
})

app.use('/api/v1', apiLimiter);

app.use('/api/v1/auth', authRouter);

app.use('/api/v1/facility', faciliityRouter);

app.use('/api/v1/mother', motherRouter);
app.use('/api/v1/mother', shareRouter);
app.use('/api/v1/share', shareRouter);

app.use('/api/v1/pregnancy', pregnancyRouter);

app.use('/api/v1/prenatal-visit', prenatalVisitRouter);

app.use('/api/v1/supplement', supplementRouter)

app.use('/api/v1/lab-screening', labScreeningRouter)

app.use('/api/v1/ehr', ehrRouter);

app.use('/api/v1/delivery-outcome', deliveryOutcomeRouter)

app.use('/api/v1/newborn-record', newbornRecordRouter)

app.use('/api/v1/postpartum-visit', postpartumVisitRouter)

app.use('/api/v1/notification', notificationRouter)

app.use('/api/v1/message', messageRouter)

app.use('/api/v1/audit-trail', auditTrailRouter)

app.use('/api/v1/referral', referralRouter)

app.use('/api/v1/cdss', cdssRouter)

app.use('/api/v1/appointment', appointmentRouter)

app.use('/api/v1/send', sendRouter)

app.use('/api/v1/user', userRouter)
app.use('/api/users', userRouter)
app.use('/api/user', userRouter)

app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        error: "InternalServerError",
        message: isProd
            ? "An unexpected internal server error occurred. Please contact support."
            : (err.message || "An unexpected error occurred.")
    });
});

const { initScheduler } = require('./services/schedulerService');

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Start periodic background tasks (appointment alerts, etc.)
    initScheduler();
});
