function sendSignAgreementEmail(creatorEmail, signeeEmail, id) {
  console.log(`Sending sign agreement email to ${signeeEmail} from ${creatorEmail} with link ${id}`);
}

function sendAgreementSignedEmail(creatorEmail, signeeEmail, id) {
  console.log(`Sending agreement signed email to ${creatorEmail} from ${signeeEmail}`);
}

module.exports = {
    sendSignAgreementEmail,
    sendAgreementSignedEmail
};