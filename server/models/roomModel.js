const mongoose = require('mongoose')

const Schema = mongoose.Schema

const roomSchema = new Schema({
    name : {
        type : String,
        required : true,
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

module.exports = mongoose.model('Room', roomSchema);

