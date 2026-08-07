require('dotenv').config();
const express = require('express')
const app = express()
const cors = require('cors');
const PORT = process.env.PORT || 6700

const authRouter = require('./router/authRouter');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.send("Birth Monitoring System's Backend is working fine")
})

app.use('/api/auth', authRouter);

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

