const apiKey = process.env.OPENAI_API_KEY
const apiURL = 'https://api.openai.com/v1/chat/completions'


const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
}


async function generateAgreement(user, inputs){
    const {
        agreementType, //tyep of agreement NDA Form, Fixed Price Contract, Reimbursement Contract, Cost Plus Contract, Bilateral Contract, Time and Material Contract, Other (Custom)
        orgName, //Name of individual or organization of agreement creator
        partyName, //Name of individual or organization of party
        effectiveDate, //Start date of agreement yyyy-mm-dd eg. 2024-10-31
        duration, //Duration of agreement in months eg. 12
        paymentTerms, 
        confidentialityClauses,
        terminationConditions,
        customClauses } = inputs //user inputs (all can be optional)

    let prompt = `Create a ${agreementType} agreement`

    if(orgName.trim() && partyName.trim()){
        prompt += ` between ${orgName} and ${partyName}.`
    }else if(orgName.trim()){
        prompt += ` for a company/individual called ${orgName}.`
    }else if(partyName.trim()){
        prompt += ` for a company/individual called ${partyName} to sign.`
    }else{
        prompt += `.`
    }

    if(effectiveDate.trim()){
        prompt += ` The agreement is effective from ${effectiveDate}.`
    }

    if(duration && !isNaN(duration)){
        prompt += ` The agreement is valid for ${duration} months.`
    }

    if(paymentTerms.trim()){
        prompt += ` The payment terms are as follows: ${paymentTerms}.`
    }

    if(confidentialityClauses.trim()){
        prompt += ` The confidentiality clauses are as follows: ${confidentialityClauses}.`
    }

    if(terminationConditions.trim()){
        prompt += ` The termination conditions are as follows: ${terminationConditions}.`
    }

    if(customClauses.trim()){
        prompt += ` The custom clauses are as follows: ${customClauses}.`
    }

    prompt += ` It should be detailed and professional, Generate the agreement formatted in plain html with good but without any inputs for sign or anything.`


    const payload = {
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: prompt
            }
        ],
        max_tokens: 10000,
    }

    const response = await fetch(apiURL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    })

    const data = await response.json()

    return data.choices[0].message.content.replace('```html', '').replace('```', '')


}

module.exports = {
    generateAgreement
}
