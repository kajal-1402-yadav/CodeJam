const express = require('express')
const router = express.Router()

const app = express()

router.post('/signup',(req, res) => {
    res.json({ mssg : 'signup route'})
})

router.post('/login',(req, res) => {
    res.json({ mssg : 'login route'})
})

router.get('/me',(req, res) => {
    res.json({ mssg : 'get current user route'})
})

module.exports = router;
