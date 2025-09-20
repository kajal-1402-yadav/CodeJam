const User = require("../models/userModel");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const validator = require("validator");


const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_Secret, { expiresIn: '3d' })
}

// signup
const signupUser = async (req, res) => {
    try {

        const { email, password } = req.body
        const user = await User.signup(email, password)

        // create a token
        const token = createToken(user._id)

        res.status(200).json({ _id: user._id, email, token } )
    }
    catch (error) {
        res.status(400).json({ error: error.message })
    }
}

// login
const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body

        const user = await User.login(email, password)

        // create token
        const token = createToken(user._id)

        res.status(200).json({ email, token })
    }
    catch (error) {
        res.status(400).json({ error: error.message })
    }
}


// get a specific user
const getUserById = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select('-password');

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json({ user });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// update a specifc user
const updateUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { email }, 
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) { 
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user: updatedUser });
    } 
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

const deleteUser = async (req, res) => {
    try {
        const userId = req.user._id;

        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } 
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = { 
    loginUser, 
    signupUser,
    getUserById,
    updateUser,
    deleteUser 
}

