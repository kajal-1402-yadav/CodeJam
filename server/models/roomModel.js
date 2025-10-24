const mongoose = require('mongoose')

const Schema = mongoose.Schema

const roomSchema = new Schema({
    name : {
        type : String,
        required : true,
        unique: true, // Prevent duplicate room names globally
        trim: true, // Remove whitespace
        lowercase: true // Case-insensitive uniqueness
    },

    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true,
    },

    participants : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User'
    }]
}, { timestamps : true })

// Index for efficient queries and uniqueness enforcement
roomSchema.index({ name: 1 }, { unique: true }); // Ensure unique room names

module.exports = mongoose.model('Room', roomSchema);

