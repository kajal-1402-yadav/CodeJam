const Room = require("../models/roomModel");
const mongoose = require("mongoose");

//create a room
const createRoom = async (req, res) => {
    try {
        const { name, participants } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Name is required" });
        }

        if (participants && !Array.isArray(participants)) {
            return res.status(400).json({ error: "Participants must be an array" });
        }

        if (participants) {
            const invalidParticipants = participants.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidParticipants.length > 0) {
                return res.status(400).json({ 
                    error: "Invalid participant Ids",
                    invalidIds: invalidParticipants
                });
            }
        }

        const room = await Room.create({
            name,
            createdBy: req.user._id, // Automatically set from authenticated user
            participants: participants || []
        });

        res.status(201).json(room);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// get all rooms (only rooms created by the current user)
const getRooms = async (req, res) => {

    try {
        const rooms = await Room.find({ createdBy: req.user._id }).populate('createdBy participants', 'name email');
        res.status(200).json(rooms);
    }
    catch (error) {
        res.status(400).json({ error: error.message })
    }
}

//get a specific room
const getRoomById = async (req, res) => {

    try {
        const room = await Room.findById(req.params.roomId).populate('createdBy participants', 'name email');

        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        res.status(200).json(room)
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

//update a room
const updateRoom = async (req, res) => {
    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        // Find the room first to check ownership
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Check if the current user is the creator of the room
        if (room.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to update this room' });
        }

        delete req.body.createdBy;

        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.roomId,
            req.body,
            { new: true, runValidators: true }
        ).populate('createdBy participants', 'name email');

        res.status(200).json(updatedRoom);
    }
    catch (error) {
        res.status(400).json({ error: error.message })
    }
}

//delete a room
const deleteRoom = async (req, res) => {

    try {
        // Find the room first to check ownership
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Check if the current user is the creator of the room
        if (room.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this room' });
        }

        const deletedRoom = await Room.findByIdAndDelete(req.params.roomId);

        res.status(200).json({ message: 'Room deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createRoom,
    getRooms,
    getRoomById,
    updateRoom,
    deleteRoom
}