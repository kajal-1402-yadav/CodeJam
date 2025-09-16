const express = require('express')
const router = express.Router()

const app = express()

router.post('/:roomId/files',(req, res) => {
    res.json({ mssg : 'post a new file in a room'})
})

router.get('/:roomId/files',(req, res) => {
    res.json({ mssg : 'get all file in a room'})
})

router.get('/:roomId/files/:fileId',(req, res) => {
    res.json({ mssg : 'Get specific file content'})
})

router.put('/:roomId/files/:fileId',(req, res) => {
    res.json({ mssg : 'update file content'})
})

router.delete('/:roomId/files/:fileId',(req, res) => {
    res.json({ mssg : 'delete a files'})
})

module.exports = router;
