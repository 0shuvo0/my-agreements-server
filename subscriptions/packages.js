const packages = {
    basic_monthly: {
        name: 'Basic',
        price: 6.99,
        variantID: 584354,
        billing: "monthly",
        maxAgreements: 10,
        maxSigneePerAgreement: 3
    },
    standard_monthly: {
        name: 'Standard',
        price: 9.99,
        variantID: 584355,
        billing: "monthly",
        maxAgreements: 50,
        maxSigneePerAgreement: 15
    },
    enterprise_monthly: {
        name: 'Enterprise',
        price: 99.99,
        variantID: 584356,
        billing: "monthly",
        maxAgreements: 200,
        maxSigneePerAgreement: 150
    },
    
    basic_yearly: {
        name: 'Basic',
        price: 69.99,
        variantID: 584357,
        billing: "yearly",
        maxAgreements: 10,
        maxSigneePerAgreement: 3
    }, 
    standard_yearly: {
        name: 'Standard',
        price: 99.99,
        variantID: 584360,
        billing: "yearly",
        maxAgreements: 50,
        maxSigneePerAgreement: 15
    },
    enterprise_yearly: {
        name: 'Enterprise',
        price: 999.99,
        variantID: 584356,
        billing: "yearly",
        maxAgreements: 200,
        maxSigneePerAgreement: 150
    }
}

module.exports = packages
