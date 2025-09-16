const express = require('express')
const router = express.Router()

const app = express()

router.get('/:roomId/users',(req, res) => {
    res.json({ mssg : 'get all active users'})
})

router.get('/users/:userId',(req, res) => {
    res.json({ msg: `Get user ${req.params.userId} works` })
})

router.put('/users/:userId',(req, res) => {
    res.json({ msg: `Update user ${req.params.userId} works` });
})

router.delete('/users/:userId',(req, res) => {
     res.json({ msg: `Delete user ${req.params.userId} works` });
})

module.exports = router;
