const express = require('express');
const router = express.Router();
const { scanDocumentWithPaddle } = require('../controllers/ocrController');

router.post('/scan', scanDocumentWithPaddle);

module.exports = router;
