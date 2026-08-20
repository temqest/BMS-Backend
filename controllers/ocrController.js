const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const scanDocumentWithPaddle = async (req, res, next) => {
    try {
        const { imageBase64 } = req.body;
        let imagePath = '';

        if (imageBase64) {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const tempFileName = `scan_${Date.now()}.png`;
            const uploadsDir = path.join(__dirname, '../public/uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            imagePath = path.join(uploadsDir, tempFileName);
            fs.writeFileSync(imagePath, buffer);
        } else if (req.file) {
            imagePath = req.file.path;
        } else {
            return res.status(400).json({ error: 'No image or base64 data provided' });
        }

        const scriptPath = path.join(__dirname, '../ocr_engine.py');
        const command = `python "${scriptPath}" "${imagePath}"`;

        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (imageBase64 && fs.existsSync(imagePath)) {
                try { fs.unlinkSync(imagePath); } catch (e) {}
            }

            if (error) {
                console.error('PaddleOCR exec error:', error, stderr);
                return res.status(500).json({
                    error: 'PaddleOCR process execution failed',
                    details: stderr || error.message
                });
            }

            try {
                const parsedResult = JSON.parse(stdout.trim());
                if (!parsedResult.success) {
                    return res.status(500).json({
                        error: 'PaddleOCR Extraction Failed',
                        details: parsedResult.error
                    });
                }

                return res.status(200).json({
                    message: 'Document OCR processed with PaddleOCR',
                    result: parsedResult
                });
            } catch (parseErr) {
                console.error('Failed to parse PaddleOCR JSON:', stdout);
                return res.status(500).json({
                    error: 'Failed to parse PaddleOCR output',
                    rawOutput: stdout
                });
            }
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    scanDocumentWithPaddle
};
