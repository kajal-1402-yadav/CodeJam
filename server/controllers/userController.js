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

        const { username, email, password } = req.body
        const user = await User.signup(username, email, password)

        // create a token
        const token = createToken(user._id)

        res.status(200).json({ _id: user._id, username: user.username, email: user.email, token })
    }
    catch (error) {
        if (error && (error.code === 11000 || error.name === 'MongoServerError') && error.keyPattern) {
            if (error.keyPattern.username) {
                return res.status(400).json({ error: 'Username already exists' })
            }
            if (error.keyPattern.email) {
                return res.status(400).json({ error: 'Email already exists' })
            }
        }
        res.status(400).json({ error: error.message })
    }
}

// login (email or username)
const loginUser = async (req, res) => {
    try {
        const { identifier, password } = req.body

        if (!identifier || !password) {
            return res.status(400).json({ error: 'All fields must be filled!' })
        }

        // Determine if identifier is an email
        const query = validator.isEmail(identifier)
            ? { email: identifier.toLowerCase() }
            : { username: identifier }

        const user = await User.findOne(query)
        if (!user) {
            return res.status(400).json({ error: 'Incorrect credentials!' })
        }

        const match = await require('bcrypt').compare(password, user.password)
        if (!match) {
            return res.status(400).json({ error: 'Incorrect password' })
        }

        const token = createToken(user._id)
        res.status(200).json({ _id: user._id, username: user.username, email: user.email, token })
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
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}



const updateUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { username, email, currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Password checks
        if (currentPassword || newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to change password' });
            }
            if (!newPassword) {
                return res.status(400).json({ error: 'New password is required' });
            }

            const isMatch = await require('bcrypt').compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters long' });
            }
        }

        // Email validation
        if (email) {
            if (!validator.isEmail(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Username validation
        if (username) {
            if (username.trim() === '') {
                return res.status(400).json({ error: 'Username cannot be empty' });
            }
            const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username already in use' });
            }
        }

        // Update object
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (newPassword) {
            const salt = await require('bcrypt').genSalt(10);
            updateData.password = await require('bcrypt').hash(newPassword, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = createToken(updatedUser._id);

        res.status(200).json({ user: updatedUser, token });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


// delete a user
const deleteUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
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

