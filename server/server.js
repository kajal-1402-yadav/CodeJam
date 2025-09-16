require('dotenv').config()

const express = require('express')

const { authRoutes, roomRoutes, fileRoutes, chatRoutes, userRoutes } = require("./routes");

// express app
const app = express()

//middleware
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
app.use('/api/rooms', userRoutes)

// listen for requests
app.listen(process.env.PORT, () => {
    console.log('Server is listening on port ', process.env.PORT)
})