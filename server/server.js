require('dotenv').config()

const express = require('express')
const mongoose = require("mongoose")
const cors = require('cors')
const http = require("http")
const { Server } = require('socket.io');

const { authRoutes, roomRoutes, fileRoutes, chatRoutes, folderRoutes, userRoutes, executeRoutes, activityRoutes } = require("./routes");

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
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
}))  

app.use((req, res, next) => {
    req.io = io; // Attach io instance to req object for easy access in controllers
    next();
});

app.use(express.json())
app.use((req, res, next) => {
    console.log(req.path, req.method)
    next()
})

// routes
app.use('/api/auth', authRoutes)
app.use('/api/rooms', chatRoutes)
app.use('/api/rooms', fileRoutes)
app.use('/api/rooms', folderRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/users', userRoutes)
app.use('/api', executeRoutes)
app.use('/api', activityRoutes)

//connect to db
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        // listen for requests using the HTTP server
        server.listen(process.env.PORT, () => {
            console.log('Connected to db and listening on port', process.env.PORT)
        })
    })
    .catch((error) => {
        console.log(error)
    })

