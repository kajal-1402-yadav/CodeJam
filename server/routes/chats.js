const express = require('express')
const router = express.Router()

const app = express()

// create a new chat msg in a room
router.post('/:roomId/chat',(req, res) => {
    res.json({ mssg : 'post a chat'})
})

// get all chat mssgs from a room
router.get('/:roomId/chat',(req, res) => {
    res.json({ mssg : 'get a chat'})
})

// delete a specific chat message
router.delete('/:roomId/chat/:messageId',(req, res) => {
    res.json({ mssg : 'delete a chat'})
})

module.exports = router;
