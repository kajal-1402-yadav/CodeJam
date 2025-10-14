const Room = require("../models/roomModel");
const mongoose = require("mongoose");
const Activity = require("../models/activityModel");
const File = require("../models/fileModel");
const Chat = require("../models/chatModel");
const Folder = require("../models/folderModel");

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
            participants: participants ? [...participants, req.user._id] : [req.user._id] // Include creator as participant
        });

        // Populate the created room to ensure participants are included in response
        const populatedRoom = await Room.findById(room._id).populate('createdBy participants', 'name email _id username');

        // Auto-create root folder with room name
        await Folder.create({
            room: room._id,
            name: name,
            parent: null, // Root folder
            createdBy: req.user._id
        });

        // Create activity for room creation
        // const Activity = require('../models/activityModel'); // Already declared at top

        // Generate enhanced description
        const generateActivityDescription = (type, metadata, userName) => {
            const { roomName } = metadata || {};
            switch (type) {
                case 'room_created':
                    return `${userName} created room "${roomName}"`;
                case 'room_updated':
                    return `${userName} updated room "${roomName}"`;
                case 'room_deleted':
                    return `${userName} deleted room "${roomName}"`;
                default:
                    return `${userName} performed ${type}`;
            }
        };

        const activity = await Activity.create({
            room: room._id,
            user: req.user._id,
            type: 'room_created',
            description: generateActivityDescription('room_created', { roomName: name }, req.user.username),
            metadata: { roomName: name }
        });

        // Emit socket event for new activity
        if (req.io) {
            const populatedActivity = await Activity.findById(activity._id)
                .populate('user', 'username email')
                .populate('room', 'name');
            req.io.emit('activityCreated', populatedActivity);
        }

        // Emit socket event for room creation
        if (req.io) {
            req.io.emit('roomCreated', populatedRoom);
        }

        res.status(201).json(populatedRoom);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// get all rooms (rooms where current user is a participant or creator)
const getRooms = async (req, res) => {

    try {
        const rooms = await Room.find({
            $or: [
                { createdBy: req.user._id },
                { participants: req.user._id }
            ]
        }).populate('createdBy participants', 'name email _id username');
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

        // Create activity for room update
        // const Activity = require('../models/activityModel'); // Already declared at top
        const updateActivity = await Activity.create({
            room: req.params.roomId,
            user: req.user._id,
            type: 'room_updated',
            description: `${req.user.username} updated room settings`,
            metadata: {
                roomName: updatedRoom.name,
                updateDetails: 'room settings'
            }
        });

        // Emit socket event for new activity
        if (req.io) {
            const populatedActivity = await Activity.findById(updateActivity._id)
                .populate('user', 'username email')
                .populate('room', 'name');
            req.io.emit('activityCreated', populatedActivity);
        }

        res.status(200).json(updatedRoom);
    }
    catch (error) {
    }
}

//delete a room
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('Delete room request for roomId:', roomId);
    console.log('roomId type:', typeof roomId);
    console.log('roomId length:', roomId.length);
    console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(roomId));

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      console.log('Room ID validation failed for:', roomId);
      return res.status(400).json({ error: 'Invalid room ID', providedId: roomId });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is the creator of the room
    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only room creator can delete the room' });
    }

    // Get room name for activity before deletion
    const roomName = room.name;

    // Create activity for room deletion before deleting the room
    // const Activity = require('../models/activityModel'); // Already declared at top
    const deleteActivity = await Activity.create({
      room: roomId,
      user: req.user._id,
      type: 'room_deleted',
      description: `${req.user.username} deleted room "${roomName}"`,
      metadata: {
        roomName,
        action: 'room_deleted'
      }
    });

    // Emit socket event for new activity before deleting
    if (req.io) {
      const populatedActivity = await Activity.findById(deleteActivity._id)
        .populate('user', 'username email')
        .populate('room', 'name');
      req.io.emit('activityCreated', populatedActivity);
    }

    // Delete all files in the room
    await File.deleteMany({ room: roomId });

    // Delete all chats in the room
    await Chat.deleteMany({ room: roomId });

    // Delete all activities in the room
    await Activity.deleteMany({ room: roomId });

    // Delete the room
    await Room.findByIdAndDelete(roomId);

    // Emit socket event to notify all clients about room deletion
    const io = req.io;
    if (io) {
      console.log(`Emitting roomDeleted event for room: ${roomName} (${roomId})`);
      io.emit('roomDeleted', { roomId: roomId, roomName });
    } else {
      console.log('Socket.io instance not available for room deletion event');
    }

    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
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