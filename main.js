require('dotenv').config();
const express = require('express')
const app = express()
const cors = require('cors');
const PORT = process.env.PORT || 6700

const authRouter = require('./router/authRouter');

const faciliityRouter = require('./router/facilityRouter');

const motherRouter = require('./router/motherRouter');

const pregnancyRouter = require('./router/pregnancyRouter');

const prenatalVisitRouter = require('./router/prenatalVisitRouter')

const immunizationRouter = require('./router/immunizationRouter')

const supplementRouter = require('./router/supplementRouter')

const labScreeningRouter = require('./router/labScreeningRouter');

const deliveryOutcomeRouter = require('./router/deliveryOutcomeRouter');

const newbornRecordRouter = require('./router/newbornRecordRouter');

const postpartumVisitRouter = require('./router/postpartumVisitRouter');

const notificationRouter = require('./router/notificationRouter');

const messageRouter = require('./router/messageRouter');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.send("Birth Monitoring System's Backend is working fine")
})

app.use('/api/v1/auth', authRouter);

app.use('/api/v1/facility', faciliityRouter);

app.use('/api/v1/mother', motherRouter);

app.use('/api/v1/pregnancy', pregnancyRouter);

app.use('/api/v1/prenatal-visit', prenatalVisitRouter);

app.use('/api/v1/immunization', immunizationRouter)

app.use('/api/v1/supplement', supplementRouter)

app.use('/api/v1/lab-screening', labScreeningRouter)

app.use('/api/v1/delivery-outcome', deliveryOutcomeRouter)

app.use('/api/v1/newborn-record', newbornRecordRouter)

app.use('/api/v1/postpartum-visit', postpartumVisitRouter)

app.use('/api/v1/notification', notificationRouter)

app.use('/api/v1/message', messageRouter)

app.use((err, req, res, next) => {
    console.error("Unhandled Server Error", err);

    res.status(500).json({
        error : "InternalServerError",
        message : err.message || "An unexpected error occurred."
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})

