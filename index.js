const express = require('express')

require('dotenv').config()

const cors = require('cors')

const { imageValidationMiddleware } = require('./utils/utils')

const {
    getUserProfile,
    verifyLoginToken,
    saveAgreement,
    updateProfilePicture,
    updateOrganizationLogo,
    saveProfileDetails,
    getSusbcriptionData
 } = require('./utils/firebase')

const { generateAgreement } = require('./utils/ai')

const { getSubscriptionURL,
        getSubscriptionCustomerPortalURL,
        changeSubscriptionPlan
        } = require('./subscriptions')

const { pdfUpload, imgUpload } = require('./utils/multer')


const app = express()

app.use(cors())

app.use(express.urlencoded({ extended: true }));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf
    }
}));

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.get('/user-profile', verifyLoginToken, async (req, res) => {
    try{
        const userProfile = await getUserProfile(req.user)

        if(!userProfile.subscription){
            console.log('not subscribed')
            return res.json({
                success: false,
                message: 'not subscribed',
                content: {
                    profile: userProfile.profile || null,
                }
            })
        }

        if(!userProfile.profile){
            console.log('not found')
            return res.json({
                success: false,
                message: 'not found',
                content: {
                    subscription: userProfile.subscription || null,
                }
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



app.post('/update-profile-picture', verifyLoginToken, imgUpload.single('profilePicture'), imageValidationMiddleware, async (req, res) => {
    try {
        const imgUrl = await updateProfilePicture(req.user, req.processedBuffer, req.mimetype);

        return res.json({ success: true, content: imgUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        });
    }
})

app.post('/update-organization-logo', verifyLoginToken, imgUpload.single('organizationLogo'), imageValidationMiddleware, async (req, res) => {
    try {
        const imgUrl = await updateOrganizationLogo(req.user, req.processedBuffer, req.mimetype);

        return res.json({ success: true, content: imgUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        });
    }
})

app.post('/save-profile-details', verifyLoginToken, async (req, res) => {
    try {
        const mendatoryFields = ['fullName', 'organizationName', 'organizationTagline']
        console.log(req.body)
        for(let field of mendatoryFields){
            if(!req.body[field]){
                res.status(400).json({
                    success: false,
                    message: 'Please fill all the fields'
                })
                console.log(1)
                return
            }
        }

        for(let field of mendatoryFields){
            if(req.body[field].trim().length < 3){
                res.status(400).json({
                    success: false,
                    message: 'All fields must be atleast 3 characters long'
                })
                console.log(2)
                return
            }
        }


        const { fullName, organizationName, organizationTagline } = req.body;

        const p = await saveProfileDetails(req.user, fullName, organizationName, organizationTagline);

        return res.json({ success: true, content: p });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        });
    }
})

app.get('/subscription-url', verifyLoginToken, async (req, res) => {
    try {
        
        const { packageName, yearly } = req.query
        if(!packageName){
            return res.status(400).json({
                success: false,
                message: 'Package name is required'
            })
        }


        const url = await getSubscriptionURL(req.user, packageName, yearly === 'true')

        return res.json({ success: true, content: url });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        });
    }
})

app.get('/subscription-customer-portal', verifyLoginToken, async (req, res) => {
    try {
        const uid = req.user.uid
        const data = await getSusbcriptionData(uid)

        if(!data){
            return res.json({
                success: false,
                message: 'No subscription found',
                content: null
            })
        }

        const subscription_id = data.first_subscription_item?.subscription_id

        if(!subscription_id){
            return res.json({
                success: false,
                message: 'Error getting subscription id',
                content: null
            })
        }

        const url = await getSubscriptionCustomerPortalURL(subscription_id)

        res.json({
            success: true,
            content: url
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        });
    }
})


app.post('/change-subscription-plan', verifyLoginToken, async (req, res) => {
    try {
        const { packageName, yearly } = req.body

        if(!packageName){
            return res.status(400).json({
                success: false,
                message: 'Package name is required'
            })
        }

        await changeSubscriptionPlan(req.user, packageName, yearly)

        return res.json({ success: true, content: 'success' });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        });
    }
})


const webhookHandler = require('./subscriptions/webhooks')
app.post('/lmnqzwh', webhookHandler)


app.listen(3000, () => {
    console.log('Server is running on port 3000')
});
