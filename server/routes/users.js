const express = require('express')
const router = express.Router()

const app = express()

// get all active users in a room
router.get('/:roomId/users',(req, res) => {
    res.json({ mssg : 'get all active users'})
})


// get a specific user
router.get('/users/:userId',(req, res) => {
    res.json({ msg: `Get user ${req.params.userId} works` })
})

// update a specifc user
router.put('/users/:userId',(req, res) => {
    res.json({ msg: `Update user ${req.params.userId} works` });
})

// delete a specific user
router.delete('/users/:userId',(req, res) => {
     res.json({ msg: `Delete user ${req.params.userId} works` });
})

module.exports = router;
