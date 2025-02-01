function sendSignAgreementEmail(creatorEmail, signeeEmail, id) {
  console.log(`Sending sign agreement email to ${signeeEmail} from ${creatorEmail} with link ${id}`);
}

function sendAgreementSignedEmail(creatorEmail, signeeEmail, id) {
  console.log(`Sending agreement signed email to ${creatorEmail} from ${signeeEmail}`);
}

function sendSigneeApprovedEmail(creatorEmail, signeeEmail, agreementName) {
  console.log(`Sending signee approved email to ${signeeEmail} from ${creatorEmail} for agreement ${agreementName}`);
}

function sendSigneeRejectededEmail(creatorEmail, signeeEmail, agreementName, reason) {
  console.log(`Sending signee rejected email to ${signeeEmail} from ${creatorEmail} for agreement ${agreementName} with reason ${reason}`);
}

function sendStatusUpdateEmail(creatorEmail, signeeEmail, agreementName, status) {
  console.log(`Sending status update email to ${signeeEmail} from ${creatorEmail} for agreement ${agreementName} with status ${status}`);
}

module.exports = {
    sendSignAgreementEmail,
    sendAgreementSignedEmail,
    sendSigneeApprovedEmail,
    sendSigneeRejectededEmail,
    sendStatusUpdateEmail
};