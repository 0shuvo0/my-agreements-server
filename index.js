const express = require('express')

require('dotenv').config()

const cors = require('cors')

const {
    getUserProfile,
    verifyLoginToken,
    saveAgreement } = require('./utils/firebase')

const { generateAgreement } = require('./utils/ai')

const multer = require('multer')
const storage = multer.memoryStorage()
const fileFilter = (req, file, cb) => {
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
const upload = multer({
        storage,
        fileFilter,
        limits: { fileSize: 100 * 1024 * 1024 }// Max size set to 100MB for safety
    })


const app = express()

app.use(cors())

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.get('/user-profile', verifyLoginToken, async (req, res) => {
    try{
        const userProfile = await getUserProfile(req.user)

        if(!userProfile){
            return res.json({
                success: false,
                message: 'not found'
            })
        }

        res.json({
            content: userProfile,
            success: true
        })
    }catch(error){
        console.log(error)
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        })
    }
})


app.post('/ai-agreement-generator', verifyLoginToken, async (req, res) => {
    try{
        const response = await generateAgreement(req.user, req.body)

        res.json({
            content: response,
            success: true
        })
    }catch(error){
        console.log(error)
        res.status(500).json({
            content: error.message,
            success: false
        })
    }
})


const agreementTypes = [
    "nda from",
    "hourly contract",
    "fixed price contract",
    "reimbursement contract",
    "cost plus contract",
    "bilateral contract",
    "time and material contract",
    "other"
]
app.post('/save-agreement', verifyLoginToken, upload.single('agreementFile'), async (req, res) => {
    try{
        const requiredDocuments = JSON.parse(req.body.requiredDocuments)
        const {
            agreementType,
            agreementName,
            agreementText,
            customDocumentName
            } = req.body
            console.log(agreementType);
            
        if(!agreementTypes.includes(agreementType)){
            console.log(1)
            return res.status(400).json({
                success: false,
                message: 'Invalid agreement type'
            })
        }

        if(!agreementName || agreementName.trim().length < 10){
            console.log(2)
            return res.status(400).json({
                success: false,
                message: 'Invalid agreement name'
            })
        }

        if(!req.file){
            if((!agreementText || agreementText.trim().length < 100 || agreementText.trim().length > 100000)){
                console.log(3)
                
                return res.status(400).json({
                    success: false,
                    message: 'Invalid agreement text'
                })
            }
        }

        if(requiredDocuments.includes('custom') && (!customDocumentName || !customDocumentName.trim())){
            console.log(4)
            return res.status(400).json({
                success: false,
                message: 'Invalid custom document name'
            })
        }

        await saveAgreement({
            agreementType,
            agreementName,
            agreementText,
            customDocumentName,
            requiredDocuments,
        }, req.user, (req.file && !req.agreementText) ? req.file : null)
        
        
        res.json({
            success: true
        })
    }catch(error){
        console.log(error)
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        })
    }
})




app.listen(3000, () => {
    console.log('Server is running on port 3000')
});


