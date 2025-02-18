const { SendMailClient } = require("zeptomail");

// For CommonJS
// var { SendMailClient } = require("zeptomail");

const url = "api.zeptomail.com/";
const token = process.env.ZEPTOMAIL_API_KEY;

let client = new SendMailClient({url, token});


// async function sendEmail(toAddresses, subject, html, text) {
//   const params = {
//     Source: "no-reply@my-agreements.com", // Must be a verified email
//     Destination: {
//       ToAddresses: toAddresses,
//     },
//     Message: {
//       Subject: { Data: subject },
//       Body: {
//         Text: { Data: text },
//         Html: { Data: `
//           <div style="font-family: font-family: 'Montserrat', Arial, sans-serif">
//             ${html}
//             <div style="margin-top: 32px; display: flex; align-items: center; gap: 16px">
//               <img src="https://my-agreements.com/assets/logo.svg" alt="My-Agreements.com Logo" style="width: 32px; height: 32px">
//               <span><a style="font-size: 24px; text-decoration: none; color: #2d2b2b" href="https://my-agreements.com">My-Agreements.com</a></span>
//             </div>
//             <p>If you have any question reach out to us at <a href="mailto:contact@my-agreements.com">contact@my-agreements.com</a></p>
//           </div>
//         ` }
//       }
//     }
//   }

//   try {
//     const command = new SendEmailCommand(params);
//     const result = await sesClient.send(command);
//   } catch (error) {
//     console.error("Error sending email:", error);
//   }
// }
async function sendEmail(toAddresses, subject, html, text) {
  const params = {
    Source: "no-reply@my-agreements.com", // Must be a verified email
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: text },
        Html: { Data: `
          <div style="font-family: font-family: 'Montserrat', Arial, sans-serif">
            ${html}
            <div style="margin-top: 32px; display: flex; align-items: center; gap: 16px">
              <img src="https://my-agreements.com/assets/logo.svg" alt="My-Agreements.com Logo" style="width: 32px; height: 32px">
              <span><a style="font-size: 24px; text-decoration: none; color: #2d2b2b" href="https://my-agreements.com">My-Agreements.com</a></span>
            </div>
            <p>If you have any question reach out to us at <a href="mailto:contact@my-agreements.com">contact@my-agreements.com</a></p>
          </div>
        ` }
      }
    }
  }

  try {
    await client.sendMail({
      "from": 
      {
          "address": "noreply@my-agreements.com",
          "name": "My Agreements"
      },
      "to": toAddresses.map((toAddress) => ({
        "email_address": {
          "address": toAddress
        }
      })),
      "subject": subject,
      "htmlbody": html,
      "textbody": text
    })
  } catch (error) {
    console.error("Error sending email:", error);
  }
}





function sendSignAgreementEmail(creatorEmail, signeeEmail, id) {
  const subject = "Invitation to sign agreement";

  const link = `https://app.my-agreements.com/sign/${id}`;

  const html = `
    <h3>This email is an invitation to sign an agreement</h3>
    <h4>created by ${creatorEmail}</h4>
    <p>Click the link below to view and sign the agreement</p>
    <a style="display: inline-flex; justify-content: center; align-items: center; padding: 16px 36px; gap: 12px; border-radius: 45px; background: #3597FF; box-shadow: 0px 7px 17.7px 0px rgba(0, 0, 0, 0.08); color: #FFF;font-size: 18px; font-weight: 600; border: none; text-decoration: none cursor: pointer;" href="${link}" target="_blank">View Agreement</a>
  `;

  const text = `This email is an invitation to sign an agreement created by ${creatorEmail}. Visit this link to view and sign the agreement: ${link}`;

  sendEmail([signeeEmail], subject, html, text);
}

function sendAgreementSignedEmail(creatorEmail, signeeEmail, id) {
  const subject = "Invitation to sign agreement";

  const link = `https://app.my-agreements.com/agreement/${id}`;

  const html = `
    <h3>This email is to notify you that ${signeeEmail} has signed the agreement</h3>
    <p>Click the link below to view the agreement</p>
    <a style="display: inline-flex; justify-content: center; align-items: center; padding: 16px 36px; gap: 12px; border-radius: 45px; background: #3597FF; box-shadow: 0px 7px 17.7px 0px rgba(0, 0, 0, 0.08); color: #FFF;font-size: 18px; font-weight: 600; border: none; text-decoration: none cursor: pointer;" href="${link}" target="_blank">View Agreement</a>
  `;

  const text = `This email is to notify you that ${signeeEmail} has signed the agreement. Visit this link to view the agreement: ${link}`;

  sendEmail([creatorEmail], subject, html, text);
}

function sendSigneeApprovedEmail(creatorEmail, signeeEmail, agreementName) {
  const subject = "Signature approved";

  const html = `
    <h3>Your signature has been approved</h3>
    <p>Your signature for the agreement ${agreementName} has been approved by ${creatorEmail}</p>
  `;

  const text = `Your signature for the agreement ${agreementName} has been approved by ${creatorEmail}`;

  sendEmail([signeeEmail], subject, html, text);
}

function sendSigneeRejectededEmail(creatorEmail, signeeEmail, agreementName, reason) {
  const subject = "Signature rejected";

  const html = `
    <h3>Your signature has been rejected</h3>
    <p>Your signature for the agreement <b>${agreementName}</b> has been rejected by ${creatorEmail}</p>
    <p>Reason: ${reason}</p>
  `;

  const text = `Your signature for the agreement <b>${agreementName}</b> has been rejected by ${creatorEmail}. Reason: ${reason}`;

  sendEmail([signeeEmail], subject, html, text);
}

function sendStatusUpdateEmail(creatorEmail, signeeEmail, agreementName, status) {
  const subject = "Agreement status update";

  const html = `
    <h3>Agreement status update</h3>
    <p>The status of the agreement <b>${agreementName}</b> has been updated to ${status}</p>
    <p>Agreement signee: ${signeeEmail}</p>
  `;

  const text = `The status of the agreement ${agreementName} has been updated to ${status}`;

  sendEmail([signeeEmail, creatorEmail], subject, html, text);
}

module.exports = {
    sendSignAgreementEmail,
    sendAgreementSignedEmail,
    sendSigneeApprovedEmail,
    sendSigneeRejectededEmail,
    sendStatusUpdateEmail
};