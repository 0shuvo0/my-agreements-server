const express = require('express')

require('dotenv').config()

const cors = require('cors')

const sharp = require("sharp")

const {
    getUserProfile,
    verifyLoginToken,
    saveAgreement,
    updateProfilePicture } = require('./utils/firebase')

const { generateAgreement } = require('./utils/ai')

const { pdfUpload, imgUpload } = require('./utils/multer')


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
app.post('/save-agreement', verifyLoginToken, pdfUpload.single('agreementFile'), async (req, res) => {
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


app.post('/update-profile-picture', verifyLoginToken, imgUpload.single('profilePicture'), async (req, res) => {
    try{
        if (!req.file) {
            return res.status(400).json({success: false, message: "No file uploaded" });
        }

        // Validate file type
        if (!["image/jpeg", "image/png"].includes(req.file.mimetype)) {
            return res.status(400).json({success: false, message: "Invalid file type" });
        }

        // Max image dimensions
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;

        // Validate image dimensions
        const image = sharp(req.file.buffer);
        const metadata = await image.metadata();

        if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
            return res.status(400).json({success: false, message: `Image dimensions exceed the limit of ${MAX_WIDTH}x${MAX_HEIGHT} pixels.` });

        }

        const imgUrl = await updateProfilePicture(req.user, req.file)

        return res.json({
            success: true,
            content: imgUrl
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


