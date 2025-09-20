const mongoose = require('mongoose');
const Chat = require('../models/chatModel');

// create a chat msg
const createChat = async (req, res) => {
    try {
        const { room, sender, message } = req.body;

        if (!room || !sender || !message) {
            return res.status(400).json({ error: "Room, sender and message are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(room)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        if (!mongoose.Types.ObjectId.isValid(sender)) {
            return res.status(400).json({ error: "Invalid sender ID" });
        }

        const chat = await Chat.create({
            room,
            sender,
            message
        });

        res.status(201).json(chat)
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

//get all chats in a room
const getChatsByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;

        const chats = await Chat.find({ room: roomId })
            .populate('sender', 'email')
            .sort({ createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        res.status(200).json(chats);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// delete a chat msg
const deleteChat = async (req, res) => {
    try {
        const { messageId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }

        const deletedChat = await Chat.findByIdAndDelete(messageId);
        if (!deletedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        res.status(200).json({ message: 'Chat deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = {
    createChat,
    getChatsByRoom,
    deleteChat
}