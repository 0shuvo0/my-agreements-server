const cron = require('node-cron')

const {
    deleteExpiredSharedAgreements,
    markStatusUpdates
 } = require('../utils/firebase')


const { 
    sendStatusUpdateEmail
 } = require('../emails')

function  initCronJobs(){
    
    // Schedule cron job to run daily at 1:00 AM
    cron.schedule('0 1 * * *', () => {
        deleteExpiredSharedAgreements()
    });

    // Schedule cron job to run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        const updates = await markStatusUpdates()
        updates.forEach(update => {
            sendStatusUpdateEmail(update.creatorEmail, update.signeeEmail, update.agreementName, update.status)
        })
    })

    console.log('Cron Jobs initialized')
}

module.exports = initCronJobs