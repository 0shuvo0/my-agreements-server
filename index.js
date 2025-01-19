const express = require('express')

require('dotenv').config()

const cors = require('cors')

const { imageValidationMiddleware, isValidEmail } = require('./utils/utils')

const {
    getUserProfile,
    verifyLoginToken,
    saveAgreement,
    updateProfilePicture,
    updateOrganizationLogo,
    saveProfileDetails,
    getSusbcriptionData,
    getAgreements,
    shareAgreement,
    getSigneeContent,
    signAgreement,
    getSignees,
    deleteAgreement,
    getAgreementsCount,
    getSigneesCount
 } = require('./utils/firebase')

const { generateAgreement } = require('./utils/ai')

const { getSubscriptionURL,
        getSubscriptionCustomerPortalURL,
        changeSubscriptionPlan,
        verifySubscription
        } = require('./subscriptions')

const { sendSignAgreementEmail, sendAgreementSignedEmail } = require('./emails')

const { pdfUpload, imgUpload, pdfAndImageUploadMiddleware } = require('./utils/multer')


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


//Profile routes
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






//Subscription routes
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





//Agreement routes

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
app.post('/save-agreement', verifyLoginToken, verifySubscription, pdfUpload.single('agreementFile'), async (req, res) => {
    try{
        if(!req.hasActiveSubscription){
            return res.json({
                success: false,
                message: 'You need to have an active subscription to create agreements'
            })
        }

        const subscriptionPackage = req.subscriptionPackage
        const agreementsCount = await getAgreementsCount(req.user.uid)

        if(agreementsCount >= subscriptionPackage.maxAgreements){
            return res.json({
                success: false,
                message: 'You have reached the maximum number of agreements allowed in your subscription. Please upgrade your subscription to create more agreements'
            })
        }




        const requiredDocuments = JSON.parse(req.body.requiredDocuments)
        const {
            agreementType,
            agreementName,
            agreementText,
            customDocumentName
            } = req.body
            
        if(!agreementTypes.includes(agreementType)){
            return res.status(400).json({
                success: false,
                message: 'Invalid agreement type'
            })
        }

        if(!agreementName || agreementName.trim().length < 10){
            return res.status(400).json({
                success: false,
                message: 'Invalid agreement name'
            })
        }

        if(!req.file){
            if((!agreementText || agreementText.trim().length < 100 || agreementText.trim().length > 100000)){
                
                return res.status(400).json({
                    success: false,
                    message: 'Invalid agreement text'
                })
            }
        }

        if(requiredDocuments.includes('custom') && (!customDocumentName || !customDocumentName.trim())){
            return res.status(400).json({
                success: false,
                message: 'Invalid custom document name'
            })
        }

        const a = await saveAgreement({
            agreementType,
            agreementName,
            agreementText,
            customDocumentName,
            requiredDocuments,
        }, req.user, (req.file && !req.agreementText) ? req.file : null)
        
        
        res.json({
            success: true,
            content: a
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

app.get('/get-agreements', verifyLoginToken, async (req, res) => {
    try{
        const agreements = await getAgreements(req.user.uid)

        res.json({
            content: agreements,
            success: true
        })
    }catch(error){
        res.status(500).json({
            content: error.message,
            message: 'Something went wrong',
            success: false
        })
    }
})

app.post('/share-agreement', verifyLoginToken, verifySubscription, async (req, res) => {
    const { agreementId, email, startDate, endDate, amount, description } = req.body
    const uid = req.user.uid

    if(!email || !isValidEmail(email)){
        return res.status(400).json({
            success: false,
            message: 'Invalid email'
        })
    }

    if(!agreementId){
        return res.status(400).json({
            success: false,
            message: 'Invalid agreement id'
        })
    }

    try{
        if(!req.hasActiveSubscription){
            return res.json({
                success: false,
                message: 'You need to have an active subscription to share agreements'
            })
        }

        const subscriptionPackage = req.subscriptionPackage
        const signeesCount = await getSigneesCount(uid, agreementId)

        if(signeesCount >= subscriptionPackage.maxSigneePerAgreement){
            return res.json({
                success: false,
                message: 'You have reached the maximum number of signees allowed in your subscription. Please upgrade your subscription to add more signees'
            })
        }



        const r = await shareAgreement(uid, { agreementId, email, startDate, endDate, amount, description })
        
        const signingLink = `https://my-agreements.com/sign/${r.id}`
        sendSignAgreementEmail(req.user.email, email, r.id) 
        console.log(r)
        return res.json({
            success: true,
            content: {
                ...r,
                signingLink
            }
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({
            success: false,
            message: error.message || 'Something went wrong'
        })
    }
})

app.get('/get-signee-content', async (req, res) => {
    const id = req.query.id
    
    try{
        const content = await getSigneeContent(id)

        return res.json({
            success: true,
            content
        })
    }catch(error){
        return res.status(500).json({
            success: false,
            message: error.message || 'Something went wrong'
        })
    }
})

app.post('/sign-agreement', pdfAndImageUploadMiddleware, async (req, res) => {
    try{
        const data = {}
        data.id = req.body.id
        data.signature = req.files['signature'][0]

        if(req.files['photo']){ data.photo = req.files['photo'][0] }
        if(req.files['id-card']){ data['id-card'] = req.files['id-card'][0] }
        if(req.files['passport']){ data['passport'] = req.files['passport'][0] }
        if(req.files['drivers-license']){ data['drivers-license'] = req.files['drivers-license'][0] }
        if(req.files['custom']){ data.custom = req.files['custom'][0] }

        
        const content = await signAgreement(data)

        sendAgreementSignedEmail(content.creatorEmail, content.signeeEmail, content.id)

        return res.json({
            success: true,
            content: content
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({
            success: false,
            message: error.message || 'Something went wrong'
        })
    }
})

app.get('/get-signees', verifyLoginToken, async (req, res) => {
    const id = req.query.id
    const uid = req.user.uid

    if(!id.trim()){
        return res.status(400).json({
            success: false,
            message: 'Invalid id'
        })
    }

    try{
        const signees = await getSignees(uid, id)

        return res.json({
            success: true,
            content: signees
        })
    }catch(error){
        return res.status(500).json({
            success: false,
            message: error.message || 'Something went wrong'
        })
    }

})

app.post('/delete-agreement', verifyLoginToken, async (req, res) => {
    const id = req.body.id
    const uid = req.user.uid

    if(!id.trim()){
        return res.status(400).json({
            success: false,
            message: 'Invalid id'
        })
    }

    try{
        await deleteAgreement(uid, id)

        return res.json({
            success: true,
            message: 'Agreement deleted'
        })
    }catch(error){
        return res.status(500).json({
            success: false,
            message: error.message || 'Something went wrong'
        })
    }
})







const webhookHandler = require('./subscriptions/webhooks')
app.post('/lmnqzwh', webhookHandler)


app.listen(3000, () => {
    console.log('Server is running on port 3000')
});
