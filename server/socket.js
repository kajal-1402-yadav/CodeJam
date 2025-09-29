const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("Client Connected : ", socket.id);

        // joining a room
        socket.oo("joinRoom", (roomId) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);
        })

        //handle chat msg
        socket.on("sendMessage", ({ roomId, message, sender }) => {
            const newMsg = { sender, message, timestampt: new Date() };
            io.to(roomId).emit("receiveMessage", newMsg);
        })

        //disconnect
        socket.on("disconnect", () => {
            console.log("Client disconnected : ", socket.id);
        })
    })
}

module.exports = socketHandler;