const packages = {
    basic_monthly: {
        name: 'Basic',
        price: 6.99,
        variantID: 584354,
        billing: "monthly"
    },
    standard_monthly: {
        name: 'Standard',
        price: 9.99,
        variantID: 584355,
        billing: "monthly"
    },
    enterprise_monthly: {
        name: 'Enterprise',
        price: 99.99,
        variantID: 584356,
        billing: "monthly"
    },
    
    basic_yearly: {
        name: 'Basic',
        price: 69.99,
        variantID: 584357,
        billing: "yearly"
    },
    standard_yearly: {
        name: 'Standard',
        price: 99.99,
        variantID: 584360,
        billing: "yearly"
    },
    enterprise_yearly: {
        name: 'Enterprise',
        price: 999.99,
        variantID: 584356,
        billing: "yearly"
    }
}

module.exports = packages
