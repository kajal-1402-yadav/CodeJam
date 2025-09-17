const express = require('express')
const router = express.Router()

const User = require("../models/userModel")

const app = express()

// Signup 
router.post('/signup',async (req, res) => {
    const {email, password} = req.body

    try{
        const user = await User.create({email, password});
        res.status(200).json(user)
    }
    catch(error){
        res.status(400).json(error)
    }
})

// Login
router.post('/login',(req, res) => {
    res.json({ mssg : 'login route'})
})

// Current user
router.get('/me',(req, res) => {
    res.json({ mssg : 'get current user route'})
})

module.exports = router;
