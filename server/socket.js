const roomUsers = {}
const Chat = require('./models/chatModel'); // Import the Chat model
const File = require('./models/fileModel'); // Import the File model

// Debounce function to limit how often a function can run
const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

// Store debounced save functions for each file
const debouncedSaveFunctions = {};
const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("Client Connected : ", socket.id);

        // joining a room
        socket.on("joinRoom", async ({ roomId, user }) => {
            try {
                socket.join(roomId);

                if (!roomUsers[roomId]) {
                    roomUsers[roomId] = new Set();
                }
                if (user && user.email) {
                    roomUsers[roomId].add(user.email);
                    console.log(`User ${user.email} (${socket.id}) joined room ${roomId}`);
                }

                // Send chat history to the newly joined user
                const chatHistory = await Chat.find({ room: roomId })
                    .sort({ createdAt: 1 })
                    .populate('sender', 'username email _id')
                    .lean();

                // Send the history only to the joining user
                socket.emit('chatHistory', chatHistory);

                // Broadcast updated user list to all users in the room
                io.to(roomId).emit("roomUsers", Array.from(roomUsers[roomId]));
            } catch (error) {
                console.error('Error in joinRoom:', error);
            }
        })

        // leaving a room
        socket.on("leaveRoom", ({ roomId, user }) => {
            if (roomUsers[roomId]) {
                roomUsers[roomId].delete(user.email);
            }
            socket.leave(roomId);
            console.log(` ${user.email} left room ${roomId}`);
        });

        //handle chat msg
        socket.on("sendMessage", async ({ roomId, message, sender }) => {
            try {
                if (!sender || !sender._id) {
                    console.error("SendMessage error: Sender ID is missing");
                    return;
                }
                const newChat = await Chat.create({
                    room: roomId,
                    sender: sender._id,
                    message: message,
                });
                const populatedChat = await newChat.populate('sender', 'username email _id');
                io.to(roomId).emit("receiveMessage", populatedChat);
            } catch (error) {
                console.error("Error handling message:", error);
            }
        });

        // -- Real-time File Editing --
        socket.on('updateFile', ({ roomId, fileId, newContent }) => {
            // Broadcast changes to other clients instantly
            socket.to(roomId).emit('fileUpdated', { fileId, newContent });

            // Create a debounced save function for this specific file if it doesn't exist
            if (!debouncedSaveFunctions[fileId]) {
                debouncedSaveFunctions[fileId] = debounce(async (content) => {
                    try {
                        await File.findByIdAndUpdate(fileId, { content });
                        console.log(`File ${fileId} saved to DB.`);
                    } catch (error) {
                        console.error(`Error saving file ${fileId}:`, error);
                    }
                }, 2000); // Save to DB after 2 seconds of inactivity
            }

            // Call the debounced function
            debouncedSaveFunctions[fileId](newContent);
        });

        // -- File Creation --
        socket.on('createFile', ({ roomId, file }) => {
            // Broadcast file creation to other clients
            socket.to(roomId).emit('fileCreated', file);
        });

        // Handle message updates
        socket.on("updateMessage", async (updatedMessage) => {
            try {
                const chat = await Chat.findByIdAndUpdate(
                    updatedMessage._id,
                    { 
                        message: updatedMessage.message,
                        isEdited: true,
                        updatedAt: new Date()
                    },
                    { new: true }
                ).populate('sender', 'username email _id');
                
                if (chat) {
                    io.to(updatedMessage.roomId).emit("messageUpdated", chat);
                }
            } catch (error) {
                console.error("Error updating message:", error);
            }
        });

        // Handle message deletion
        socket.on("deleteMessage", async ({ messageId, roomId }) => {
            try {
                await Chat.findByIdAndDelete(messageId);
                io.to(roomId).emit("messageDeleted", messageId);
            } catch (error) {
                console.error("Error deleting message:", error);
            }
        });

        // Disconnect
        socket.on("disconnect", () => {
            console.log("Client disconnected : ", socket.id);
        })
    })
}

module.exports = socketHandler;