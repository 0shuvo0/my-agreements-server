const {
    deleteExpiredSharedAgreements
 } = require('../utils/firebase')


async function handler(req, res) {
    try {
        await deleteExpiredSharedAgreements()
        return res.status(200).json({ message: "Deleted expired agreements" })
    } catch (error) {
        console.error("Error deleting expired agreements:", error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

module.exports = handler