const express = require('express')
const router = express.Router()

const app = express()

// Signup 
router.post('/signup',(req, res) => {
    res.json({ mssg : 'signup route'})
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
