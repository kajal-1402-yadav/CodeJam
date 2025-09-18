const File = require("../models/fileModel");
const mongoose = require("mongoose");


// upload a new file in a room
const uploadFile = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { filename, content, uploadedBy } = req.body;

        if (!filename || !uploadedBy) {
            return res.status(400).json({ error: "Filename and uploadedBy are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(uploadedBy)) {
            return res.status(400).json({ error: "Invalid uploadedBy ID" });
        }

        const file = await File.create({
            room: roomId,
            filename,
            content: content || '',
            uploadedBy
        });

        res.status(201).json(file);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// get all files in a room
const getFilesByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        const files = await File.find({ 
            room: roomId 
        }).populate('uploadedBy', 'name email').sort({ createdAt: -1 });

        res.status(200).json(files);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// get specific file content
const getFileById = async (req, res) => {
    try {
        const { roomId, fileId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: "Invalid file ID" });
        }

        const file = await File.findOne({ 
            _id: fileId,
            room: roomId 
        }).populate('uploadedBy', 'name email');

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        res.status(200).json(file);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update a specific file
const updateFile = async (req, res) => {
    try {
        const { roomId, fileId } = req.params;
        const { filename, content } = req.body;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: "Invalid file ID" });
        }

        const updateData = {};

        if (filename !== undefined) {
            updateData.filename = filename;
        }
        if (content !== undefined) {
            updateData.content = content;
        }

        const file = await File.findOneAndUpdate(
            { _id: fileId, room: roomId },
            updateData,
            { new: true, runValidators: true }
        ).populate('uploadedBy', 'name email');

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        res.status(200).json(file);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a specific file
const deleteFile = async (req, res) => {
    try {
        const { roomId, fileId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: "Invalid file ID" });
        }

        const file = await File.findOneAndDelete({ _id: fileId, room: roomId });

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    uploadFile,
    getFilesByRoom,
    getFileById,
    updateFile,
    deleteFile
};
