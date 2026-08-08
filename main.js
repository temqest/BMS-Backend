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

