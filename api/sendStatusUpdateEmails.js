const cron = require('node-cron')

const {
    markStatusUpdates
 } = require('../utils/firebase')


const { 
    sendStatusUpdateEmail
 } = require('../emails')


async function handler(req, res) {
    try {
        const updates = await markStatusUpdates();
        for (const update of updates) {
            sendStatusUpdateEmail(update.creatorEmail, update.signeeEmail, update.agreementName, update.status);
        }
        return res.status(200).json({ message: "Status update emails sent" });
    } catch (error) {
        console.error("Error sending status update emails:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = handler