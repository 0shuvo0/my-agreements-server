const apiKey = process.env.OPENAI_API_KEY
const apiURL = 'https://api.openai.com/v1/chat/completions'


const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
}
async function generateAgreement(user, inputs) {
    // Input validation and defaults
    const {
        agreementType = 'Standard',
        orgName = '',
        partyName = '',
        effectiveDate = '',
        duration = '',
        paymentTerms = '',
        confidentialityClauses = '',
        terminationConditions = '',
        customClauses = ''
    } = inputs;


    // Build the system message for better context
    const systemMessage = {
        role: "system",
        content: `You are a legal document generator. Generate a detailed ${agreementType} agreement in HTML format. 
        The agreement should be professional, comprehensive, and legally sound. 
        Include all standard clauses and sections appropriate for this type of agreement.
        Do not include any input fields, signature blocks, or date fields.
        Maintain consistent formatting and structure throughout the document.`
    };

    // Build the user message with specific agreement details
    let agreementDetails = [];
    
    // Add primary details
    agreementDetails.push(`Type: ${agreementType}`);
    
    if (orgName || partyName) {
        agreementDetails.push(`Parties: ${orgName || "Party A"} and ${partyName || "Party B"}`);
    }
    
    if (effectiveDate) {
        agreementDetails.push(`Effective Date: ${effectiveDate}`);
    }
    
    if (duration && !isNaN(duration)) {
        agreementDetails.push(`Duration: ${duration} months`);
    }

    // Add optional clauses if provided
    const clauses = [
        { label: "Payment Terms", content: paymentTerms },
        { label: "Confidentiality Clauses", content: confidentialityClauses },
        { label: "Termination Conditions", content: terminationConditions },
        { label: "Custom Clauses", content: customClauses }
    ];

    clauses.forEach(({ label, content }) => {
        if (content?.trim()) {
            agreementDetails.push(`${label}: ${content}`);
        }
    });

    const userMessage = {
        role: "user",
        content: `Create a ${agreementType} agreement with the following details:\n\n${agreementDetails.join('\n\n')}`
    };

    const payload = {
        model: "gpt-4o",
        messages: [systemMessage, userMessage],
        max_tokens: 10000,
        temperature: 0.7, // Add some controlled variability
        presence_penalty: 0.6, // Encourage inclusion of important details
        frequency_penalty: 0.3 // Reduce repetition
    };

    try {
        const response = await fetch(apiURL, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response format');
        }

        // Clean and validate the response
        const content = data.choices[0].message.content;
        
        // Check for error responses in the content
        if (content.toLowerCase().includes("i'm sorry") || 
            content.toLowerCase().includes("i apologize") ||
            content.toLowerCase().includes("cannot provide")) {
            throw new Error('AI generated an error response instead of agreement');
        }

        // Clean up HTML content
        return content
            .replace(/```html/gi, '')
            .replace(/```/g, '')
            .trim();

    } catch (error) {
        console.error('Agreement generation failed:', error);
        throw new Error(`Failed to generate agreement: ${error.message}`);
    }
}

module.exports = {
    generateAgreement
}
