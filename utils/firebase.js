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





async function uploadFileToFbStorage(file, mimetype) {
    const fileExtension = mimetype.split('/').pop();
    const fileName = `${Date.now()}-${parseInt(Math.random() * 1000000)}.${fileExtension}`;
    
    const fileReference = bucket.file(fileName);

    return new Promise((resolve, reject) => {
        const stream = fileReference.createWriteStream({
            metadata: {
                contentType: mimetype
            }
        });

        stream.on('error', (error) => {
            reject(error);
        });

        stream.on('finish', async () => {
            try {
                // Make the file public
                await fileReference.makePublic();
                const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                resolve(url);
            } catch (error) {
                reject(error);
            }
        });

        stream.end(file.buffer);
    });
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

                stream.on('finish', async () => {
                    // Make the file publicly accessible
                    await fileUpload.makePublic();
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

                stream.on('finish', async () => {
                    console.log('Text file uploaded to storage');
                    await fileUpload.makePublic();
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
}
const getAgreements = async (uid) => {
    try {
        //order by createdAt
        const snapshot = await db.collection('agreements').where('user', '==', uid).orderBy('createdAt', 'desc').get();
        const agreements = [];

        snapshot.forEach((doc) => {
            agreements.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return agreements;
    } catch (error) {
        console.error('Error getting agreements:', error);
        throw error;
    }
}
const getAgreementsCount = async (uid) => {
    try {
        const agreementsQuery = db.collection('agreements').where('user', '==', uid);
        const snapshot = await agreementsQuery.get();

        return snapshot.empty ? 0 : snapshot.size;
    } catch (error) {
        console.error(`Error getting agreements count for user ${uid}:`, error);
        throw error; // Re-throw the error for upstream handling
    }
};

const shareAgreement = async (user, data) => {
    const uid  = user.uid
    const creatorEmail = user.email
    try {
        const { agreementId, name, email, startDate, endDate, amount, description } = data

        // Get the agreement from Firestore, make sure it exists and agreement.user === uid
        const agreementRef = db.collection('agreements').doc(agreementId);
        const agreementDoc = await agreementRef.get();

        if (!agreementDoc.exists) {
            throw new Error('Agreement not found');
        }

        const agreementData = agreementDoc.data();
        if (agreementData.user !== uid) {
            throw new Error('Unauthorized');
        }


        // Save the shared agreement to Firestore

        //expires in 24 hours
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);

        const shareData = {
            agreementId,
            name,
            email,
            createdAt: new Date(),
            expiresAt: expiresAt,
            creatorId: uid,
            creatorEmail: creatorEmail
        }

        if (startDate) {//eg: '2024-11-21T00:00:00.000Z'
            shareData.startDate = new Date(startDate);
        }

        if (endDate) {
            shareData.endDate = new Date(endDate);
        }

        if (amount) {
            shareData.amount = amount;
        }

        if (description) {
            shareData.description = description;
        }

        const result = await db.collection('sharedAgreements').add(shareData)


        
        return { ...shareData, id: result.id };
    } catch (error) {
        console.error('Error sharing agreement:', error);
        throw error;
    }
}
const getSigneeContent = async (id) => {
    try {
        // Fetch the shared agreement document
        const sharedAgreementDoc = await db.collection('sharedAgreements').doc(id).get();
        if (!sharedAgreementDoc.exists) {
            throw new Error('Shared agreement not found');
        }

        const sharedAgreementData = sharedAgreementDoc.data();

        // Fetch the agreement and user documents in parallel
        const [agreementDoc, userDoc] = await Promise.all([
            db.collection('agreements').doc(sharedAgreementData.agreementId).get(),
            db.collection('users').doc(sharedAgreementData.creatorId).get()
        ]);

        if (!agreementDoc.exists) {
            throw new Error('Agreement not found');
        }

        const agreement = agreementDoc.data();
        const user = userDoc.exists ? userDoc.data() : null;

        
        // Return the combined result
        return {
            meta: {
                ...sharedAgreementData,
                amount: sharedAgreementData.amount
            },
            agreement,
            user,
        };
    } catch (error) {
        console.error('Error getting signee content:', error.message);
        throw error;
    }
}
const deleteAgreement = async (uid, agreementId) => {
    try {
        // Fetch agreement and validate ownership
        const agreementRef = db.collection('agreements').doc(agreementId);
        const agreementDoc = await agreementRef.get();

        if (!agreementDoc.exists) {
            throw new Error('Agreement not found');
        }

        const agreementData = agreementDoc.data();
        if (agreementData.user !== uid) {
            throw new Error('Unauthorized');
        }

        // Fetch all signatures for this agreement
        const signaturesRef = db.collection('signatures').where('agreementId', '==', agreementId);
        const signatures = await signaturesRef.get();

        // Prepare deletion promises for all files
        const fileDeletionPromises = [];
        const signatureDeletionPromises = [];

        // Add agreement file to deletion queue if it exists
        if (agreementData.fileUrl) {
            const agreementFileName = agreementData.fileUrl.split('/').pop();
            fileDeletionPromises.push(
                bucket.file(agreementFileName).delete()
                    .catch(err => console.warn(`Failed to delete agreement file ${agreementFileName}:`, err))
            );
        }

        // Process all signatures
        signatures.docs.forEach(signature => {
            const signatureData = signature.data();
            
            // Add signature file to deletion queue
            if (signatureData.signature) {
                const signatureFileName = signatureData.signature.split('/').pop();
                fileDeletionPromises.push(
                    bucket.file(signatureFileName).delete()
                        .catch(err => console.warn(`Failed to delete signature file ${signatureFileName}:`, err))
                );
            }

            // Add signature documents to deletion queue
            if (signatureData.documents) {
                Object.values(signatureData.documents).forEach(docUrl => {
                    const docFileName = docUrl.split('/').pop();
                    fileDeletionPromises.push(
                        bucket.file(docFileName).delete()
                            .catch(err => console.warn(`Failed to delete document file ${docFileName}:`, err))
                    );
                });
            }

            // Add signature document deletion to queue
            signatureDeletionPromises.push(
                db.collection('signatures').doc(signature.id).delete()
                    .catch(err => console.warn(`Failed to delete signature document ${signature.id}:`, err))
            );
        });

        // Execute all deletions in parallel
        await Promise.all([
            ...fileDeletionPromises,
            ...signatureDeletionPromises,
            agreementRef.delete()
        ]);

        return agreementData;
    } catch (error) {
        console.error('Error deleting agreement:', error);
        throw error;
    }
}
const getSigneesCount = async (uid, agreementId) => {
    try {
        const signeesQuery = db.collection('signatures').where('creatorId', '==', uid).where('agreementId', '==', agreementId);
        const snapshot = await signeesQuery.get();

        return snapshot.empty ? 0 : snapshot.size;
    } catch (error) {
        console.error(`Error getting signees count for user ${uid}:`, error);
        throw error; // Re-throw the error for upstream handling
    }
}
const approveSignee = async (uid, agreementId, signeeId, immediate) => {
    try {
        // Fetch signature and validate ownership
        const signatureRef = db.collection('signatures').doc(signeeId);
        const signatureDoc = await signatureRef.get();

        if (!signatureDoc.exists) {
            throw new Error('Signature not found');
        }

        const signatureData = signatureDoc.data();

        if (signatureData.creatorId !== uid || signatureData.agreementId !== agreementId) {
            throw new Error('Unauthorized');
        }

        // Fetch agreement
        // and get agreement.agreementName

        const agreementRef = db.collection('agreements').doc(agreementId)
        const agreementDoc = await agreementRef.get()
        const agreementData = agreementDoc.data()
        const agreementName = agreementData.agreementName

        //delete agreement.toReview by 1
        await agreementRef.update({
            toReview: admin.firestore.FieldValue.increment(-1)
        })


        let status = signatureData.status
        if(immediate){
            status = 'started'
        }else if(signatureData.startDate){
            //get start date in dd-mm-yyyy format
            const startDate = signatureData.startDate.toDate()
            const startDay = startDate.getDate()
            const startMonth = startDate.getMonth() + 1
            const startYear = startDate.getFullYear()
            const formattedStartDate = `${startDay}-${startMonth}-${startYear}`

            const currentDate = new Date()
            const currentDay = currentDate.getDate()
            const currentMonth = currentDate.getMonth() + 1
            const currentYear = currentDate.getFullYear()
            const formattedCurrentDate = `${currentDay}-${currentMonth}-${currentYear}`

            console.log('Start date:', formattedStartDate)
            console.log('Current date:', formattedCurrentDate)

            if(formattedStartDate === formattedCurrentDate){
                status = 'started'
            }
        }

        // Update signature approved status
        await signatureRef.update({
            approved: true,
            status: status
        })

        return {
            ...signatureData,
            approved: true,
            status: status,
            agreementName
        }
    } catch (error) {
        console.error('Error approving signee:', error);
        throw error;
    }
}
const markStatus = async (uid, agreementId, signeeId, status) => {
    try {
        // Fetch signature and validate ownership
        const signatureRef = db.collection('signatures').doc(signeeId);
        const signatureDoc = await signatureRef.get();

        if (!signatureDoc.exists) {
            throw new Error('Signature not found');
        }

        const signatureData = signatureDoc.data();
        if (signatureData.creatorId !== uid || signatureData.agreementId !== agreementId) {
            throw new Error('Unauthorized');
        }

        //get agreementName
        const agreementRef = db.collection('agreements').doc(agreementId)
        const agreementDoc = await agreementRef.get()
        if(!agreementDoc.exists){
            throw new Error('Agreement not found')
        }

        const agreementData = agreementDoc.data()

        // Update signature status to 'started'
        await signatureRef.update({
            status
        });

        return {
            ...signatureData,
            status,
            agreementData: agreementData.agreementName
        };
    } catch (error) {
        console.error('Error marking signee as started:', error);
        throw error;
    }
}







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

const signAgreement = async (data) => {
    // {
    //     id: 'dceD3GniTCafEZxmw8Rg'
    //     photo: null,
    //     'id-card': null,    
    //     passport: null, 
    //     'drivers-license': null,
    //     custom: null,
    //     signature: null
    // }
    // everything except signature is optional
    // signature will be a blob of image
    // others can either be File object of pdf/gif or image blob
    // console.log(data)
    const { id, signature } = data

    try {
        if(!id) throw new Error('Agreement ID is required')
        if(!signature) throw new Error('Signature is required')

        // id is shared agreement id   
        const sharedAgreementRef = await db.collection('sharedAgreements').doc(id) 
        const sharedAgreementDoc = await sharedAgreementRef.get()    
        if(!sharedAgreementDoc.exists) throw new Error('Shared agreement not found')

        
        const sharedAgreementData = sharedAgreementDoc.data()
        const agreementId = sharedAgreementData.agreementId
        const creatorId = sharedAgreementData.creatorId
        const signeeName = sharedAgreementData.name
        const signeeEmail = sharedAgreementData.email
        const creatorEmail = sharedAgreementData.creatorEmail

        //fetch agreement
        const agreementRef = await db.collection('agreements').doc(agreementId)
        const agreementDoc = await agreementRef.get()
        if(!agreementDoc.exists) throw new Error('Agreement not found')

        const agreementData = agreementDoc.data()
        const requiredDocuments = agreementData.requiredDocuments || []

        if(requiredDocuments.length){
            //check if all required documents are present
            for(const doc of requiredDocuments){
                if(!data[doc]){
                    throw new Error(`Missing required document: ${doc}`)
                }
            }       
        }

        //upload signature to firebase storage and get url
        const signatureUrl = await uploadFileToFbStorage(signature, signature.mimetype)

        //upload other required documents to firebase storage and get urls
        const documentUrls = {}

        if (requiredDocuments.length > 0) {
            const uploadPromises = requiredDocuments.map(async (doc) => {
                if (data[doc]) {
                    const url = await uploadFileToFbStorage(data[doc], data[doc].mimetype);
                    documentUrls[doc] = url;
                }
            });
        
            // Wait for all uploads to complete
            await Promise.all(uploadPromises);
        }

        //save signature and document urls to Firestore
        let status = 'pending'

        const  { startDate, endDate, amount, description } = sharedAgreementData

        //if current date  >= startDate set status to 'active'
        // if(startDate && new Date() >= new Date(startDate)){
        //     status = 'started'
        // }
        
        //if current date > endDate set status to 'expired'
        // if(endDate && new Date() > new Date(endDate)){
        //     status = 'complete'
        // }

        const signatureData = {
            signature: signatureUrl,
            signedAt: new Date(),
            signeeName,
            signedBy: signeeEmail,
            agreementId,
            creatorId,
            approved: false
        }

        if(startDate){ signatureData.startDate = new Date(startDate._seconds * 1000) }
        if(endDate){ signatureData.endDate = new Date(endDate._seconds * 1000) }

        if(status){ signatureData.status = status }
        if(amount){ signatureData.amount = amount }
        if(description){ signatureData.description = description }

        if(requiredDocuments.length){
            signatureData.documents = documentUrls
        }
        if(requiredDocuments.includes('custom')){
            signatureData.customDocumentName = agreementData.customDocumentName
        }

        const result = await db.collection('signatures').add(signatureData) 

        //increase agreement.toReview and agreement.signeeCount by 1 or set to 1 if they don't exist
        await agreementRef.update({
            toReview: admin.firestore.FieldValue.increment(1),
            signeeCount: admin.firestore.FieldValue.increment(1)
        })

        //delete shared agreement
        await sharedAgreementRef.delete() 

        return {
             ...signatureData,
             id: result.id,
             creatorEmail: creatorEmail
            }
    }catch(error){
        throw error
    }
    
}

const getSignees = async (uid, agreementId) => {
    try {
        const snapshot = await db.collection('signatures')
                                .where('creatorId', '==', uid)
                                .where('agreementId', '==', agreementId)
                                .orderBy('signedAt', 'desc')
                                .get();
        const signees = [];

        snapshot.forEach((doc) => {
            signees.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return signees;
    } catch (error) {
        console.error('Error getting signees:', error);
        throw error;
    }
}

const deleteSignee = async (uid, agreementId, signeeId) => {
    try {
        // Fetch signature and validate ownership
        const signatureRef = db.collection('signatures').doc(signeeId);
        const signatureDoc = await signatureRef.get();

        if (!signatureDoc.exists) {
            throw new Error('Signature not found');
        }

        const signatureData = signatureDoc.data();
        if (signatureData.creatorId !== uid || signatureData.agreementId !== agreementId) {
            throw new Error('Unauthorized');
        }


        const wasApproved = signatureData.approved
        // Fetch agreement and update
        // Decrease agreement.signeeCount by 1
        // Decrease agreement.toReview by 1 if the signature was not approved
        const agreementRef = db.collection('agreements').doc(agreementId);

        const agreementDoc = await agreementRef.get();
        const agreementData = agreementDoc.data();

        await agreementRef.update({
            signeeCount: admin.firestore.FieldValue.increment(-1),
            toReview: wasApproved ? admin.firestore.FieldValue.increment(0) : admin.firestore.FieldValue.increment(-1)
        });


        // Prepare deletion promises for all files
        const fileDeletionPromises = [];

        // Add signature file to deletion queue if it exists
        if (signatureData.signature) {
            const signatureFileName = signatureData.signature.split('/').pop();
            fileDeletionPromises.push(
                bucket.file(signatureFileName).delete()
                    .catch(err => console.warn(`Failed to delete signature file ${signatureFileName}:`, err))
            );
        }
 
        // Add signature documents to deletion queue
        if (signatureData.documents) {
            Object.values(signatureData.documents).forEach(docUrl => {
                const docFileName = docUrl.split('/').pop();
                fileDeletionPromises.push(
                    bucket.file(docFileName).delete()
                        .catch(err => console.warn(`Failed to delete document file ${docFileName}:`, err))
                );
            });
        }

        // Execute all deletions in parallel
        await Promise.all([
            ...fileDeletionPromises,
            signatureRef.delete()
        ]);

        return {
            ...signatureData,
            agreementName: agreementData.agreementName
        };
    } catch (error) {
        console.error('Error deleting signee:', error);
        throw error;
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
    // console.log('Saving profile details:', fullName, organizationName, organizationTagline);
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






const deleteExpiredSharedAgreements = async () => {
    try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
        const snapshot = await db.collection("sharedAgreements")
            .where("createdAt", "<", twentyFourHoursAgo)
            .get();

        if (snapshot.empty) return;

        const deletionPromises = [];
        snapshot.forEach((doc) => {
            deletionPromises.push(doc.ref.delete());
        });

        const results = await Promise.allSettled(deletionPromises);
        results.forEach((result) => {
            if (result.status === 'rejected') {
                console.error('Failed to delete document:', result.reason);
            }
        });

        console.log('Expired shared agreements deleted');
    } catch (error) {
        console.error('Error deleting expired shared agreements:', error);
    }
};

//Mark status as started for all signees whose startDate is <= today
//Mark status as complete for all signees whose endDate is < today
//return array of objects
//each object should have agreementName, creatorEmail, signeeEmail, status
const markStatusUpdates = async () => {
    const updates = [];
    const now = new Date();
    const batch = db.batch();
    let hasUpdates = false; // Track if batch should commit

    try {
        // Query signees with startDate <= now and endDate < now
        const [startDateSnapshot, endDateSnapshot] = await Promise.all([
            db.collection('signatures').where('startDate', '<=', now).where('status', '!=', 'started').get(),
            db.collection('signatures').where('endDate', '<', now).where('status', '!=', 'complete').get(),
        ]);

        const documents = new Map();

        // Process startDate snapshot (set status to 'started')
        startDateSnapshot.forEach((doc) => {
            documents.set(doc.id, { doc, status: 'started' });
        });

        // Process endDate snapshot first (ensure 'complete' takes precedence)
        endDateSnapshot.forEach((doc) => {
            documents.set(doc.id, { doc, status: 'complete' });
        });

        // Process startDate snapshot (only set 'started' if not already 'complete')
        startDateSnapshot.forEach((doc) => {
            if (!documents.has(doc.id)) {
                documents.set(doc.id, { doc, status: 'started' });
            } else if (documents.get(doc.id).status !== 'complete') {
                // If it's not already 'complete', mark as 'started'
                documents.get(doc.id).status = 'started';
            }
        });

        // Process documents and prepare batch updates
        await Promise.all(
            Array.from(documents.values()).map(async ({ doc, status }) => {
                const signeeData = doc.data();

                if (!signeeData.agreementId || !signeeData.creatorId || !signeeData.signedBy) {
                    console.warn(`Missing required fields in document ${doc.id}`);
                    return;
                }

                try {
                    // Fetch agreement and creator details in parallel
                    const [agreementDoc, creatorDoc] = await Promise.all([
                        db.collection('agreements').doc(signeeData.agreementId).get(),
                        db.collection('users').doc(signeeData.creatorId).get(),
                    ]);

                    if (!agreementDoc.exists) {
                        console.warn(`Agreement with ID ${signeeData.agreementId} not found`);
                        return;
                    }
                    if (!creatorDoc.exists) {
                        console.warn(`Creator with ID ${signeeData.creatorId} not found`);
                        return;
                    }

                    const agreementName = agreementDoc.data().agreementName;
                    const creatorEmail = creatorDoc.data().email;

                    // Add status update to the list
                    updates.push({
                        agreementName,
                        creatorEmail,
                        signeeEmail: signeeData.signedBy,
                        status,
                    });

                    // Only update Firestore if the status has changed
                    if (signeeData.status !== status) {
                        batch.update(doc.ref, { status });
                        hasUpdates = true;
                    }
                } catch (error) {
                    console.error(`Error processing document ${doc.id}:`, error);
                }
            })
        );

        // Commit batch updates only if changes were made
        if (hasUpdates) {
            await batch.commit();
        }

        console.log('Status updates processed:', updates);
        return updates;
    } catch (error) {
        console.error('Error marking status updates:', error);
        throw error;
    }
};










module.exports = {
    verifyLoginToken,

    getUserProfile,
    saveAgreement,
    getAgreements,
    shareAgreement,
    getSigneeContent,
    signAgreement,
    getSignees,
    deleteAgreement,
    getAgreementsCount,
    getSigneesCount,
    deleteSignee,
    approveSignee,
    markStatus,

    updateProfilePicture,
    updateOrganizationLogo,
    saveProfileDetails,
    
    getSusbcriptionData,
    saveSubscriptionData,


    deleteExpiredSharedAgreements,
    markStatusUpdates
}