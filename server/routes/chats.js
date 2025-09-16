const express = require('express')
const router = express.Router()

const app = express()

router.post('/:roomId/chat',(req, res) => {
    res.json({ mssg : 'post a chat'})
})

router.get('/:roomId/chat',(req, res) => {
    res.json({ mssg : 'get a chat'})
})


router.delete('/:roomId/chat/:messageId',(req, res) => {
    res.json({ mssg : 'delete a chat'})
})

module.exports = router;
