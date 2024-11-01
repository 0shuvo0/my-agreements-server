const admin = require('firebase-admin')
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://my-agreements.firebasestorage.app'

    

})

const db = admin.firestore()

const bucket = admin.storage().bucket()


// Middleware to verify Firebase ID token
const verifyLoginToken = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Unauthorized')
    }

    const idToken = authHeader.split(' ')[1]

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken)
        req.user = decodedToken
        next()
    } catch (error) {
        console.error('Error verifying ID token:', error)
        res.status(401).send('Unauthorization failed')
    }
}

const saveAgreement = async (inputs, user, file = null) => {
    const {
        agreementType,
        agreementName,
        agreementText,
        customDocumentName,
        requiredDocuments
    } = inputs;

    const agreement = {
        agreementType,
        agreementName,
        user: user.uid,
        createdAt: new Date()
    };

    if (requiredDocuments?.length) {
        agreement.requiredDocuments = requiredDocuments;
    }

    if (requiredDocuments?.includes('custom')) {
        agreement.customDocumentName = customDocumentName;
    }

    if (!file && agreementText) {
        agreement.agreementText = agreementText;
    }

    if (file) {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${agreementType}-${agreementName}-${user.uid}-${Date.now()}.${fileExtension}`;
        const fileUpload = bucket.file(fileName);

        try {
            await new Promise((resolve, reject) => {
                const stream = fileUpload.createWriteStream({
                    metadata: {
                        contentType: file.mimetype
                    }
                });

                stream.on('error', (error) => {
                    console.error('Error uploading file:', error);
                    reject(error);
                });

                stream.on('finish', () => {
                    console.log('File uploaded to storage');
                    agreement.fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`
                    agreement.fileType = fileExtension
                    
                    resolve();
                });

                stream.end(file.buffer); // Assuming `file.buffer` exists when using memory storage
            });

            // Save to Firestore after the file has been uploaded
            const result = await db.collection('agreements').add(agreement);
            console.log('Agreement saved with ID:', result.id);
            return { ...agreement, id: result.id };

        } catch (error) {
            console.error('Error saving agreement:', error);
            throw error;
        }
    } else {
        try {
            // Save agreement without file
            const result = await db.collection('agreements').add(agreement);
            console.log('Agreement saved with ID:', result.id);
            return { ...agreement, id: result.id };
        } catch (error) {
            console.error('Error saving agreement:', error);
            throw error;
        }
    }
};


module.exports = {
    verifyLoginToken,
    saveAgreement
}