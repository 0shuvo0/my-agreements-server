const crypto = require('node:crypto')
const WHSECRET = process.env.LEMON_SQUEEZY_WHS

const packages = require('./packages')

const { saveSubscriptionData, handleSubscriptionCancellation } = require('../utils/firebase') 

async function handler(req, res) {
    const hmac = crypto.createHmac('sha256', WHSECRET);
    const digest = Buffer.from(hmac.update(req.rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');
    
    if (!crypto.timingSafeEqual(digest, signature)) {
        return res.status(401).send('Signature mismatch')
    }

    const eventType = req.headers['x-event-name']
    
    
    const customData = req.body.meta.custom_data
    const { uid, email, } = customData //eg. ElQHz8BA3GPF7LHI3MfjVlh04Pn2, seriouslolz1@gmail.com

    const data = req.body.data
    const { variant_id, customer_id, order_id, status, billing_anchor, first_subscription_item, renews_at, card_brand, card_last_four } = data.attributes

    //find package witth variant_id
    const package = packages[Object.keys(packages).find(key => packages[key].variantID === variant_id)]

    if(!package){
        return res.status(400).send('Invalid package')
    }


    const subscription = {
        uid,
        email,
        billing: package.billing,
        packageName: package.name,
        customer_id,
        order_id,
        status,
        billing_anchor,
        first_subscription_item,
        renews_at,
        // customer_portal: urls.customer_portal,
        email,
        price: package.price,
        updated_at: (new Date()).toISOString()
    }

    if(card_brand) subscription.card_brand = card_brand
    if(card_last_four) subscription.card_last_four = card_last_four

    if(eventType === 'subscription_created' || eventType === 'subscription_updated' || eventType === 'subscription_plan_changed'){
        try{
            await saveSubscriptionData(uid, subscription)
            return res.status(200).send('Subscription data saved')
        }catch(error){
            console.error(error)
            return res.status(500).send('Something went wrong')
        }
    }else if(eventType === 'subscription_cancelled'){
        try{
            // await saveSubscriptionData(uid, subscription)
            handleSubscriptionCancellation(uid)
            return res.status(200).send('Subscription calcellation handled')
        }catch(error){
            console.error(error)
            return res.status(500).send('Something went wrong')
        }
    }else{
        console.log('Unhandled vent: ', eventType)
        console.log('Data: ', req.body)
        return res.status(200).send('Event not handled')
    }

}

module.exports = handler