const Folder = require("../models/folderModel");
const mongoose = require("mongoose");

// Create folder
const createFolder = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, parent, createdBy } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({ error: "Name and createdBy are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: "Invalid room ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(400).json({ error: "Invalid createdBy ID" });
    }

    if (parent && !mongoose.Types.ObjectId.isValid(parent)) {
      return res.status(400).json({ error: "Invalid parent ID" });
    }

    const folder = await Folder.create({ room: roomId, name, parent: parent || null, createdBy });
    res.status(201).json(folder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get folders in a room
const getFoldersByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: "Invalid room ID" });
    }
    const folders = await Folder.find({ room: roomId }).sort({ createdAt: 1 });
    res.status(200).json(folders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Rename folder
const renameFolder = async (req, res) => {
  try {
    const { roomId, folderId } = req.params;
    const { name } = req.body;
    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }
    const folder = await Folder.findOneAndUpdate({ _id: folderId, room: roomId }, { name }, { new: true });
    if (!folder) return res.status(404).json({ error: "Folder not found" });
    res.status(200).json(folder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete folder
const deleteFolder = async (req, res) => {
  try {
    const { roomId, folderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }
    await Folder.findOneAndDelete({ _id: folderId, room: roomId });
    res.status(200).json({ message: "Folder deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createFolder,
  getFoldersByRoom,
  renameFolder,
  deleteFolder
};


