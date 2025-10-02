const express = require('express');
const router = express.Router();

const {
    createChat,
    getChatsByRoom,
    deleteChat
} = require("../controllers/chatController");

const requireAuth = require('../middleware/requireAuth');

// All chat routes require authentication
router.use(requireAuth);

// create a new chat msg in a room
router.post('/:roomId/chats', createChat);

// get all chat mssgs from a room
router.get('/:roomId/chats', getChatsByRoom );

// delete a specific chat message
router.delete('/:roomId/chats/:messageId', deleteChat);

module.exports = router;
