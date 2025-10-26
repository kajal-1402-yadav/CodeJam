const express = require('express');
const router = express.Router();
const {
    uploadFile,
    getFilesByRoom,
    getFileById,
    getFileByName,
    updateFile,
    deleteFile,
    getMyFiles
} = require('../controllers/fileController');

const requireAuth = require('../middleware/requireAuth');

// All file routes require authentication
router.use(requireAuth);

// Get files uploaded by current user (must come before parameterized routes)
router.get('/my-files', getMyFiles);

// upload a new file in a room
router.post('/:roomId/files', uploadFile);

// get all files in a room
router.get('/:roomId/files', getFilesByRoom);

// get file by filename (for HTML preview with external CSS/JS) - must be before :fileId route
router.get('/:roomId/files/by-name/:filename', getFileByName);

// get specific file content
router.get('/:roomId/files/:fileId', getFileById);

// update a specific file
router.put('/:roomId/files/:fileId', updateFile);

// delete a specific file
router.delete('/:roomId/files/:fileId', deleteFile);

module.exports = router;
