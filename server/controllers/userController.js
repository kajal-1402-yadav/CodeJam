const User = require("../models/userModel");
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")

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

        res.status(200).json({ email, token })
    }
    catch (error) {
        res.status(400).json({ error: error.message })
    }
}

// login
const loginUser = async (req, res) => {
    try {
        
        const { email, password } = req.body

        const user = await User.login( email, password)

        // create token
        const token = createToken(user._id)

        res.status(200).json({ email, token })
    }
    catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = { loginUser, signupUser }
