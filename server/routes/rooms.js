const express = require('express')
const router = express.Router()

const app = express()

// create a room
router.post('/',(req, res) => {
    res.json({ mssg : 'create a new room'})
})

// get list of all rooms
router.get('/',(req, res) => {
    res.json({ mssg : 'list all new rooms'})
})

//get a specific room
router.get('/:roomId',(req, res) => {
    res.json({ mssg : 'get specific room'})
})

// update a specific room
router.put("/:roomId", (req, res) => {
  res.json({ msg: `Update room ${req.params.roomId} works` });
});

// delete a specific room
router.delete('/:roomId',(req, res) => {
    res.json({ mssg : 'delete a room'})
})

module.exports = router;
