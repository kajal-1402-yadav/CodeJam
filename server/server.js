require('dotenv').config()

const express = require('express')
const mongoose = require("mongoose")
const cors = require('cors')
const http = require("http")

const { authRoutes, roomRoutes, fileRoutes, chatRoutes, userRoutes } = require("./routes");

// express app
const app = express()
const server = http.createServer(app);

// socket.io setup
const io = new Server(server, {
    cors : {
        origin : "http://localhost:5173",
        methods : ["GET", "POST"]
    }
})

//attach socket handler
const socketHandler = require("./socket")
socketHandler(io);

//middleware
app.use(cors())  // Add this before your routes
app.use(express.json())
app.use((req, res, next) => {
    console.log(req.path, req.method)
    next()
})

// routes
app.use('/api/auth', authRoutes)
app.use('/api/rooms', chatRoutes)
app.use('/api/rooms', fileRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/users', userRoutes)

//connect to db
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        // listen for requests
        app.listen(process.env.PORT, () => {
            console.log('Connected to db and listening on port ', process.env.PORT)
        })
    })
    .catch((error) => {
        console.log(error)
    })

