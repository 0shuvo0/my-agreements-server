const express = require('express')

require('dotenv').config()

const cors = require('cors')

const { verifyLoginToken } = require('./utils/firebase')

const { generateAgreement } = require('./utils/ai')

const app = express()

app.use(cors())

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World')
})


app.post('/ai-agreement-generator', verifyLoginToken, async (req, res) => {
    try{
        const response = await generateAgreement(req.user, req.body)

        res.json({
            content: response,
            success: true
        })
    }catch(error){
        console.log(error)
        res.status(500).json({
            content: error.message,
            success: false
        })
    }
})



app.listen(3000, () => {
    console.log('Server is running on port 3000')
});


