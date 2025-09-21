const express = require('express')
const router = express.Router()
const User = require('../models/userModel');
const { 
    getUserById,
    updateUser,
    deleteUser 
} = require("../controllers/userController")

const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// get a specific user
router.get('/profile', requireAuth, getUserById)

// update a specifc user
router.put('/profile', requireAuth ,updateUser)

// delete a specific user
router.delete('/profile', requireAuth, deleteUser)

module.exports = router;
