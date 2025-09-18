const express = require('express')
const router = express.Router()

const {
    createRoom,
    getRooms,
    getRoomById,
    updateRoom,
    deleteRoom
} = require("../controllers/roomController")

// create a room
router.post('/', createRoom)

// get list of all rooms
router.get('/', getRooms)

//get a specific room
router.get('/:roomId', getRoomById)

// update a specific room
router.put("/:roomId", updateRoom);

// delete a specific room
router.delete('/:roomId', deleteRoom)

module.exports = router;
