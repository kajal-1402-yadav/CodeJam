const mongoose = require('mongoose')

const Schema = mongoose.Schema

const fileSchema = new Schema({
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    language: { 
    type: String, 
    enum: ["javascript", "typescript", "python", "java", "c", "cpp", "html", "css", "json", "markdown", "plaintext"], 
    required: true 
  },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null
    }
}, { timestamps: true })

module.exports = mongoose.model('File', fileSchema)

