const sharp = require("sharp")


async function imageValidationMiddleware(req, res, next) {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Validate file type
    if (!["image/jpeg", "image/png"].includes(req.file.mimetype)) {
        return res.status(400).json({ success: false, message: "Invalid file type" });
    }

    // Get file extension from mimetype
    const mimetype = req.file.mimetype.split('/').pop();

    // Max image dimensions
    const MAX_WIDTH = 1000;
    const MAX_HEIGHT = 1000;

    // Process image with sharp
    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
        return res.status(400).json({ success: false, message: `Image dimensions exceed the limit of ${MAX_WIDTH}x${MAX_HEIGHT} pixels.` });
    }

    // Convert the image to the correct format and buffer
    const processedBuffer = await image
        .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside' })
        .toFormat(mimetype)
        .toBuffer();

    req.processedBuffer = processedBuffer;
    req.mimetype = mimetype;

    next();
}

function isValidEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}




module.exports = {imageValidationMiddleware,isValidEmail };
