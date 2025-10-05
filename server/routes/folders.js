const express = require('express')
const router = express.Router()

const {
    createFolder,
    getFoldersByRoom,
    renameFolder,
    deleteFolder
} = require('../controllers/folderController')

const requireAuth = require('../middleware/requireAuth')

// All folder routes require authentication
router.use(requireAuth)

// create a folder
router.post('/:roomId/folders', createFolder)

// get all folders in a room
router.get('/:roomId/folders', getFoldersByRoom)

// rename a folder
router.put('/:roomId/folders/:folderId', renameFolder)

// delete a folder
router.delete('/:roomId/folders/:folderId', deleteFolder)

module.exports = router;


