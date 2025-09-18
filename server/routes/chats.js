const express = require('express')
const router = express.Router()

const {
    createChat,
    getChatsByRoom,
    deleteChat
} = require("../controllers/chatController")

// create a new chat msg in a room
router.post('/:roomId/chat', createChat);

// get all chat mssgs from a room
router.get('/:roomId/chat', getChatsByRoom );

// delete a specific chat message
router.delete('/:roomId/chat/:messageId',deleteChat);

module.exports = router;
