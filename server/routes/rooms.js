const express = require('express')
const router = express.Router()

const app = express()

router.post('/',(req, res) => {
    res.json({ mssg : 'create a new room'})
})

router.get('/',(req, res) => {
    res.json({ mssg : 'list all new rooms'})
})

router.get('/:roomId',(req, res) => {
    res.json({ mssg : 'get specific room'})
})

router.put("/:roomId", (req, res) => {
  res.json({ msg: `Update room ${req.params.roomId} works` });
});


router.delete('/:roomId',(req, res) => {
    res.json({ mssg : 'delete a room'})
})

module.exports = router;
