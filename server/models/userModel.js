const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const validator = require("validator")

const Schema = mongoose.Schema

const userSchema = new Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    }
}, { timestamps: true })


//static signup
userSchema.statics.signup = async function (username, email, password) {

    //validation
    if (!username || !email || !password) {
        throw Error("All fields must be filled!")
    }

    if (!validator.isEmail(email)) {
        throw Error("Email is not valid!")
    }

    if (!validator.isStrongPassword(password)) {
        throw Error("Password is not strong enough")
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedUsername = String(username).trim().toLowerCase()

    // Check for existing email
    const existingEmail = await this.findOne({ email: normalizedEmail })
    if (existingEmail) {
        throw Error('Email already exists')
    }

    // Check for existing username
    const existingUsername = await this.findOne({ username: normalizedUsername })
    if (existingUsername) {
        throw Error('Username already exists')
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = await this.create({ username: normalizedUsername, email: normalizedEmail, password: hash })

    return user
}

// static login
userSchema.statics.login = async function (email, password) {

    //validation
    if (!email || !password) {
        throw Error("All fields must be filled!")
    }

    const user = await this.findOne({ email })

    if (!user) {
        throw Error("Incorrect credentials!")
    }

    const match = await bcrypt.compare(password, user.password)

    if (!match) {
        throw Error("Incorrect password")
    }

    return user
}

module.exports = mongoose.model('User', userSchema)
