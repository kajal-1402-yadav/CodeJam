const roomUsers = {}
const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("Client Connected : ", socket.id);

        // joining a room
        socket.on("joinRoom", ({ roomId, user }) => {
            socket.join(roomId);

            if (!roomUsers[roomId]) {
                roomUsers[roomId] = new Set();
            }
            if (user && user.email) {
                roomUsers[roomId].add(user.email);
                console.log(`User ${user.email} (${socket.id}) joined room ${roomId}`);
            }

            // broadcast updated user list
            io.to(roomId).emit("roomUsers", Array.from(roomUsers[roomId]));
        })

        // leaving a room
        socket.on("leaveRoom", ({ roomId, user }) => {
            if (roomUsers[roomId]) {
                roomUsers[roomId].delete(user.email);
                io.to(roomId).emit("roomUsers", Array.from(roomUsers[roomId]));
            }
            socket.leave(roomId);
            console.log(` ${user.email} left room ${roomId}`);
        });

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