const multer = require('multer')
const storage = multer.memoryStorage()

const pdfFileFilter = (req, file, cb) => {
    // Check if file is empty (allow null/empty)
    if (!file) return cb(null, true);

    // Check file type
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Only PDF and TXT files are allowed'), false);
    }

    // Apply size limits based on file type
    const maxSize = file.mimetype === 'application/pdf' ? 100 * 1024 * 1024 : 50 * 1024; // 100MB for PDF, 50KB for TXT
    if (file.size > maxSize) {
        return cb(new Error(`File size exceeds the limit of ${maxSize / 1024 / 1024}MB`), false);
    }

    // If all checks pass
    cb(null, true);
};
const pdfUpload = multer({
        storage,
        fileFilter: pdfFileFilter,
        limits: { fileSize: 100 * 1024 * 1024 }// Max size set to 100MB for safety
    })

const imgFileFilter = (req, file, cb) => {
    // Check if file is empty (allow null/empty)
    if (!file) return cb(null, true);

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Only JPG & PNG files are allowed'), false);
    }

    // Apply size limits based on file type
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
        return cb(new Error(`File size exceeds the limit of ${maxSize / 1024 / 1024}MB`), false);
    }

    // If all checks pass
    cb(null, true);
};

const imgUpload = multer({
        storage,
        fileFilter: imgFileFilter,
        limits: { fileSize: 3 * 1024 * 1024 }// Max size set to 3MB for safety
    })

module.exports = {
    pdfUpload,
    imgUpload
}