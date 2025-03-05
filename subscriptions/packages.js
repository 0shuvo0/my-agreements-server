const variantIDs = {
    dev: {
        basic_monthly: 584354,
        basic_yearly: 584357,
        enterprise_monthly: 584356,
        enterprise_yearly: 584360,
        standard_monthly: 584355,
        standard_yearly: 584359
    },
    prod: {
        basic_monthly: 709878,
        basic_yearly: 709879,
        enterprise_monthly: 709880,
        enterprise_yearly: 709881,
        standard_monthly: 709882,
        standard_yearly: 709883
    }
}

const E = 'prod'

const packages = {
    basic_monthly: {
        name: 'Basic',
        price: 6.99,
        variantID: variantIDs[E].basic_monthly,
        billing: "monthly",
        maxAgreements: 10,
        maxSigneePerAgreement: 3
    },
    standard_monthly: {
        name: 'Standard',
        price: 9.99,
        variantID: variantIDs[E].standard_monthly,
        billing: "monthly",
        maxAgreements: 50,
        maxSigneePerAgreement: 15
    },
    enterprise_monthly: {
        name: 'Enterprise',
        price: 99.99,
        variantID: variantIDs[E].enterprise_monthly,
        billing: "monthly",
        maxAgreements: 200,
        maxSigneePerAgreement: 150
    },
    
    basic_yearly: {
        name: 'Basic',
        price: 69.99,
        variantID: variantIDs[E].basic_yearly,
        billing: "yearly",
        maxAgreements: 10,
        maxSigneePerAgreement: 3
    }, 
    standard_yearly: {
        name: 'Standard',
        price: 99.99,
        variantID: variantIDs[E].standard_yearly,
        billing: "yearly",
        maxAgreements: 50,
        maxSigneePerAgreement: 15
    },
    enterprise_yearly: {
        name: 'Enterprise',
        price: 999.99,
        variantID: variantIDs[E].enterprise_yearly,
        billing: "yearly",
        maxAgreements: 200,
        maxSigneePerAgreement: 150
    }
}

module.exports = packages
