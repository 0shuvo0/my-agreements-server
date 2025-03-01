const LEMON_SQUEEZY_ENDPOINT = 'https://api.lemonsqueezy.com/v1'

const headers = {
    'Content-Type': 'application/vnd.api+json',
    'Accept': 'application/vnd.api+json',
    'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
}

const axios = require('axios')

const lemonSqueezyApiInstance = axios.create({
    baseURL: LEMON_SQUEEZY_ENDPOINT,
    headers
})

const { getSusbcriptionData } = require('../utils/firebase')
const packages = require('./packages')

const verifySubscription = async (req, res, next) => {
    const { user } = req
    if(!user){
        return res.status(401).send('Unauthorized')
    }

    req.hasActiveSubscription = true

    const data = await getSusbcriptionData(user.uid)
    if(!data || data.status !== 'active'){
        req.hasActiveSubscription = false
    }

    
    
    const isYearly = data.billing === 'yearly'
    const packageName = data.packageName.toLowerCase()
    const p = `${packageName}_${isYearly ? 'yearly' : 'monthly'}`
    const package = packages[p]

    if(!package){
        req.hasActiveSubscription = false
        return next()
    }
    
    req.subscription = data
    req.subscriptionPackage = package

    next()
}


const getSubscriptionURL = async (user, packageName, yearly = false) => {
    try{
        const { email, uid } = user
        if(!email || !uid){
            throw new Error('Invalid user')
        }

        const p = `${packageName}_${yearly ? 'yearly' : 'monthly'}`
        const package = packages[p]
        if(!package){
            throw new Error('Invalid package selected')
        }
        const checkout_data = {
                email,
                custom: {
                    uid,
                    email,
                    packageName: p,
                    billing: yearly ? 'yearly' : 'monthly'
                }
            }
        if(user.fullName || user.displayName){
            checkout_data.name = user.fullName || user.displayName
        }

        const data = await lemonSqueezyApiInstance.post('/checkouts', {
            data: {
                type: "checkouts",
                attributes: {
                    checkout_data
                },
                relationships: {
                    store: {
                        data: {
                            type: "stores",
                            id: process.env.LEMON_SQUEEZY_STORE_ID
                        }
                    },
                    variant: {
                        data: {
                            type: "variants",
                            id: package.variantID.toString()
                        }
                    }
                }
            }
        })
        
        const checkoutURL = data.data.data.attributes.url

        return checkoutURL
    }catch(error){
        throw new Error(error)
    }
}

const getSubscriptionCustomerPortalURL = async (subscription_id) => {
    // curl "https://api.lemonsqueezy.com/v1/subscriptions/1" \
    // -H 'Accept: application/vnd.api+json' \
    // -H 'Content-Type: application/vnd.api+json' \
    // -H 'Authorization: Bearer {api_key}'
    try{
        const data = await lemonSqueezyApiInstance.get(`/subscriptions/${subscription_id}`)
        const portalURL = data.data.data.attributes.urls.customer_portal
        return portalURL
    }catch(error){
        throw new Error(error)
    }

}

//change-subscription-plan
const changeSubscriptionPlan = async (user, packageName, yearly = false) => {
    try{
        const { email, uid } = user
        if(!email || !uid){
            throw new Error('Invalid user')
        }

        const p = `${packageName}_${yearly ? 'yearly' : 'monthly'}`
        const package = packages[p]
        if(!package){
            throw new Error('Invalid package selected')
        }


        const data = await getSusbcriptionData(uid)
        if(!data){
            throw new Error('No subscription found')
        }

        const subscription_id = data.first_subscription_item?.subscription_id
        const new_variant_id = package.variantID


        const patchData = {
            data: {
                type: "subscriptions",
                id: subscription_id.toString(),
                attributes: {
                    variant_id: new_variant_id.toString(),
                    invoice_immediately: true
                },
            }
        }

        const res = await lemonSqueezyApiInstance.patch(`/subscriptions/${subscription_id}`, patchData)

    }catch(error){
        throw new Error(error)
    }
}

module.exports = {
    getSubscriptionURL,
    getSubscriptionCustomerPortalURL,
    changeSubscriptionPlan,
    verifySubscription
}