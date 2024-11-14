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

    try {
        if (file) {
            // If there's a file, upload it to Firebase Storage
            const fileExtension = file.originalname.split('.').pop();
            const fileName = `${agreementType}-${agreementName}-${user.uid}-${Date.now()}.${fileExtension}`;
            const fileUpload = bucket.file(fileName);

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
                    agreement.fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                    agreement.fileType = fileExtension;
                    resolve();
                });

                stream.end(file.buffer); // Assuming `file.buffer` exists when using memory storage
            });

        } else if (agreementText) {
            // If there's no file but agreementText exists, save it as a .txt file
            const fileName = `${agreementType}-${agreementName}-${user.uid}-${Date.now()}.txt`;
            const fileUpload = bucket.file(fileName);

            await new Promise((resolve, reject) => {
                const stream = fileUpload.createWriteStream({
                    metadata: {
                        contentType: 'text/plain'
                    }
                });

                stream.on('error', (error) => {
                    console.error('Error uploading agreementText file:', error);
                    reject(error);
                });

                stream.on('finish', () => {
                    console.log('Text file uploaded to storage');
                    agreement.fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                    agreement.fileType = 'txt';
                    resolve();
                });

                stream.end(Buffer.from(agreementText, 'utf-8')); // Convert agreementText to Buffer for upload
            });
        }

        // Save to Firestore after the file (or agreementText file) has been uploaded
        const result = await db.collection('agreements').add(agreement);
        console.log('Agreement saved with ID:', result.id);
        return { ...agreement, id: result.id };

    } catch (error) {
        console.error('Error saving agreement:', error);
        throw error;
    }
};






const saveSubscriptionData = async (uid, subscription) => {
    try{
        console.log('Saving subscription data:', subscription)
        //save subscription data to Firestore, overwriting any existing data
        await db.collection('subscriptions').doc(uid).set(subscription)
    }catch(error){
        console.error('Error saving subscription data:', error)
        throw error
    }
}

const getSusbcriptionData = async (uid) => {
    try{
        const snapshot = await db.collection('subscriptions').doc(uid).get()
        return snapshot.exists ? snapshot.data() : null
    }catch(error){
        console.error('Error getting subscription data:', error)
        throw error
    }
}






const getUserProfile = async (user) => {
    try {
        //return user profile from Firestore or null if it doesn't exist

        const snapshot = await db.collection('users').doc(user.uid).get();
        const subscriptionData = await getSusbcriptionData(user.uid)

        if(!snapshot.exists && !subscriptionData){
            return null
        }

        const data = snapshot.data()
        

        return {
            profile: data || null,
            subscription: subscriptionData
        }


    } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
    }
};

const updatePicture = async (user, buffer, mimetype, docField = 'profilePicture') => {
    try {
        // Retrieve user profile from Firestore
        const profile = await getUserProfile(user);
        const email = user.email;

        // Define file metadata and name
        const fileExtension = mimetype.split('/').pop();
        const fileName = `${Date.now()}-${docField.toLowerCase()}-${user.uid}.${fileExtension}`;
        const fileUpload = bucket.file(fileName);

        let prevImgUrl;
        if (profile) {
            prevImgUrl = profile[docField];
        }

        // Upload the processed image buffer to Firebase Storage
        await new Promise((resolve, reject) => {
            const stream = fileUpload.createWriteStream({
                metadata: {
                    contentType: mimetype,
                }
            });

            stream.on('error', (error) => {
                console.error('Error uploading file:', error);
                reject(error);
            });

            stream.on('finish', async () => {
                console.log('File uploaded to storage');
                imgUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

                try {
                    // Make the file publicly accessible
                    await fileUpload.makePublic();
                    console.log('File is now public');
                } catch (error) {
                    console.error('Error making file public:', error);
                }

                // Delete previous profile picture if it exists
                if (prevImgUrl) {
                    const prevFileName = prevImgUrl.split('/').pop();
                    const prevFile = bucket.file(prevFileName);
                    prevFile.delete().then(() => {
                        console.log('Previous profile picture deleted');
                    }).catch((error) => {
                        console.error('Error deleting previous profile picture:', error);
                    });
                }

                resolve();
            });

            // Write the processed image buffer to Firebase Storage
            stream.end(buffer);
        });

        // Update profile picture URL in Firestore
        if (!profile) {
            // If profile doesn't exist, create a new one
            await db.collection('users').doc(user.uid).set({
                email,
                [docField]: imgUrl,
            });
        } else {
            // Update the profile picture URL
            await db.collection('users').doc(user.uid).update({
                [docField]: imgUrl,
            });
        }

        return imgUrl;
    } catch (error) {
        console.error('Error updating profile picture:', error);
        throw error;
    }
};

const updateProfilePicture = async (user, buffer, mimetype) => {
    try{
        return await updatePicture(user, buffer, mimetype, 'profilePicture')
    }catch(error){
        console.error(error)
        throw error
    }
}

const updateOrganizationLogo = async (user, buffer, mimetype) => {
    try{
        return await updatePicture(user, buffer, mimetype, 'organizationLogo')
    }catch(error){
        console.error(error)
        throw error
    }
}

const saveProfileDetails = async (user, fullName, organizationName, organizationTagline) => {
    console.log('Saving profile details:', fullName, organizationName, organizationTagline);
    try {
        //if user profile doesn't exist, create a new one
        // await db.collection('users').doc(user.uid).set({
        //     fullName,
        //     organizationName,
        //     organizationTagline,
        // }, { merge: true });

        //save profile and rertun it
        const profile = {
            fullName,
            organizationName,
            organizationTagline,
        };

        await db.collection('users').doc(user.uid).set(profile, { merge: true });

        return profile;
    } catch (error) {
        console.error('Error saving profile details:', error);
        throw error;
    }
}

module.exports = {
    getUserProfile,
    verifyLoginToken,
    saveAgreement,
    updateProfilePicture,
    updateOrganizationLogo,
    saveProfileDetails,
    getSusbcriptionData,
    saveSubscriptionData
}