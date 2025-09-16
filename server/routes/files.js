const express = require('express')
const router = express.Router()

const app = express()

// upload a new file in a room
router.post('/:roomId/files',(req, res) => {
    res.json({ mssg : 'post a new file in a room'})
})

// get all files in a room
router.get('/:roomId/files',(req, res) => {
    res.json({ mssg : 'get all file in a room'})
})

// get specific file content
router.get('/:roomId/files/:fileId',(req, res) => {
    res.json({ mssg : 'Get specific file content'})
})

// update a specific file
router.put('/:roomId/files/:fileId',(req, res) => {
    res.json({ mssg : 'update file content'})
})

// delete a specific file
router.delete('/:roomId/files/:fileId',(req, res) => {
    res.json({ mssg : 'delete a files'})
})

module.exports = router;
