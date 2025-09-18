const express = require('express');
const router = express.Router();
const {
    uploadFile,
    getFilesByRoom,
    getFileById,
    updateFile,
    deleteFile
} = require('../controllers/fileController');

// upload a new file in a room
router.post('/:roomId/files', uploadFile);

// get all files in a room
router.get('/:roomId/files', getFilesByRoom);

// get specific file content
router.get('/:roomId/files/:fileId', getFileById);

// update a specific file
router.put('/:roomId/files/:fileId', updateFile);

// delete a specific file
router.delete('/:roomId/files/:fileId', deleteFile);

module.exports = router;
