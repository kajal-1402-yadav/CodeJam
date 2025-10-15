const roomUsers = {}
const jwt = require('jsonwebtoken');
const Chat = require('./models/chatModel'); // Import the Chat model
const File = require('./models/fileModel'); // Import the File model
const Activity = require('./models/activityModel'); // Import the Activity model
const Room = require('./models/roomModel'); // Import the Room model
const User = require('./models/userModel'); // Import the User model

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
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth && socket.handshake.auth.token;
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = { _id: decoded._id };
            }
        } catch (e) {
            // If token invalid, proceed without attaching user; routes still protected via HTTP
        }
        next();
    });

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

                    // Add user to room's participants in database
                    try {
                        const room = await Room.findById(roomId);
                        if (room && !room.participants.includes(user._id)) {
                            room.participants.push(user._id);
                            await room.save();
                            console.log(`Added user ${user.email} to room ${roomId} participants in database`);
                        }
                    } catch (dbError) {
                        console.error('Error updating room participants in database:', dbError);
                    }

                    // Create activity for user joining room
                    try {
                        const room = await Room.findById(roomId).select('name');
                        const roomName = room?.name || 'Unknown Room';

                        const joinActivity = await Activity.create({
                            room: roomId,
                            user: user._id,
                            type: 'user_joined',
                            description: `${user.username || 'User'} joined room "${roomName}"`,
                            metadata: {
                                roomName,
                                action: 'user_joined'
                            }
                        });

                        // Emit socket event for new activity (global for dashboard)
                        const populatedJoinActivity = await Activity.findById(joinActivity._id)
                            .populate('user', 'username email')
                            .populate('room', 'name');
                        io.emit('activityCreated', populatedJoinActivity);

                        console.log(`Created activity for user ${user.email} joining room ${roomId}`);
                    } catch (activityError) {
                        console.error('Error creating join room activity:', activityError);
                    }

                    // Broadcast join notification to other users in room (ephemeral)
                    socket.to(roomId).emit("userJoinedNotification", {
                        user: user.username || 'User',
                        timestamp: new Date()
                    });
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

                // Also emit to dashboard for participant count updates
                io.emit("roomParticipantsUpdated", {
                  roomId: roomId,
                  participants: Array.from(roomUsers[roomId])
                });

                // If user wasn't already a participant, emit event for dashboard
                try {
                    const room = await Room.findById(roomId);
                    const wasParticipant = room && room.participants && room.participants.some(p => p.toString() === user._id.toString());
                    if (!wasParticipant) {
                      io.emit("userJoinedRoom", {
                        roomId: roomId,
                        room: room
                      });
                    }
                } catch (error) {
                    console.error('Error checking participant status:', error);
                }

                // Note: user_joined activities are not stored in database (ephemeral only)
            } catch (error) {
                console.error('Error in joinRoom:', error);
            }
        })

        // leaving a room
        socket.on("leaveRoom", async ({ roomId, user }) => {
            if (roomUsers[roomId]) {
                roomUsers[roomId].delete(user.email);
            }
            socket.leave(roomId);
            console.log(` ${user.email} left room ${roomId}`);

            // Remove user from room's participants in database
            try {
                Room.findByIdAndUpdate(
                    roomId,
                    { $pull: { participants: user._id } },
                    { new: true }
                ).exec();
                console.log(`Removed user ${user.email} from room ${roomId} participants in database`);
            } catch (dbError) {
                console.error('Error removing user from room participants in database:', dbError);
            }

            // Create activity for user leaving room
            try {
                const room = await Room.findById(roomId).select('name');
                const roomName = room?.name || 'Unknown Room';

                await Activity.create({
                    room: roomId,
                    user: user._id,
                    type: 'user_left',
                    description: `${user.username || 'User'} left room "${roomName}"`,
                    metadata: {
                        roomName,
                        action: 'user_left'
                    }
                });
                console.log(`Created activity for user ${user.email} leaving room ${roomId}`);
            } catch (activityError) {
                console.error('Error creating leave room activity:', activityError);
            }

            // Broadcast leave notification to other users in room (ephemeral)
            socket.to(roomId).emit("userLeftNotification", {
                user: user.username || 'User',
                timestamp: new Date()
            });

            // Note: user_left activities are not stored in database (ephemeral only)
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

                // Get room name for activity
                const Room = require('./models/roomModel');
                const room = await Room.findById(roomId).select('name');

                // Generate enhanced description
                const generateActivityDescription = (type, metadata, userName) => {
                  const { message, roomName } = metadata || {};
                  switch (type) {
                    case 'message_sent':
                      return `${userName} sent: "${message}" in ${roomName}`;
                    default:
                      return `${userName} performed ${type}`;
                  }
                };

                // Create activity for message sent
                const messageActivity = await Activity.create({
                    room: roomId,
                    user: sender._id,
                    type: 'message_sent',
                    description: generateActivityDescription('message_sent', {
                        message: message,
                        roomName: room?.name || 'Unknown Room'
                    }, sender.username || 'User'),
                    metadata: {
                        message: message,
                        roomName: room?.name || 'Unknown Room'
                    }
                });

                // Emit socket event for new activity (global for dashboard)
                const populatedMessageActivity = await Activity.findById(messageActivity._id)
                    .populate('user', 'username email')
                    .populate('room', 'name');
                io.emit('activityCreated', populatedMessageActivity);

                const populatedChat = await newChat.populate('sender', 'username email _id');
                io.to(roomId).emit("receiveMessage", populatedChat);
            } catch (error) {
                console.error("Error handling message:", error);
            }
        });

        // -- Real-time File Editing --
        socket.on('updateFile', ({ roomId, fileId, newContent, userId }) => {
            // Broadcast changes to other clients instantly
            socket.to(roomId).emit('fileUpdated', { fileId, newContent, userId });

            // Create a debounced save function for this specific file if it doesn't exist
            if (!debouncedSaveFunctions[fileId]) {
                debouncedSaveFunctions[fileId] = debounce(async (content) => {
                    try {
                        await File.findByIdAndUpdate(fileId, { content });

                        // Create activity for file edit after saving
                        try {
                            const file = await File.findById(fileId).populate('uploadedBy', 'username');
                            const room = await Room.findById(roomId).select('name');
                            const roomName = room?.name || 'Unknown Room';

                            if (file) {
                                const fileEditActivity = await Activity.create({
                                    room: roomId,
                                    user: userId || (socket.user && socket.user._id) || (file.uploadedBy && file.uploadedBy._id) || null,
                                    type: 'file_edited',
                                    description: `${(file.uploadedBy && file.uploadedBy.username) || 'User'} edited file in ${roomName}`,
                                    metadata: {
                                        filename: file.filename,
                                        roomName,
                                        fileId: file._id
                                    }
                                });

                                // Emit socket event for new activity (global for dashboard)
                                const populatedFileEditActivity = await Activity.findById(fileEditActivity._id)
                                    .populate('user', 'username email')
                                    .populate('room', 'name');
                                io.emit('activityCreated', populatedFileEditActivity);

                                console.log(`Created activity for file edit: ${file.name} in room ${roomId}`);
                            }
                        } catch (activityError) {
                            console.error('Error creating file edit activity:', activityError);
                        }

                        console.log(`File ${fileId} saved to DB.`);
                    } catch (error) {
                        console.error(`Error saving file ${fileId}:`, error);
                    }
                }, 2000); // Save to DB after 2 seconds of inactivity
            }

            // Call the debounced function
            debouncedSaveFunctions[fileId](newContent);
        });

        // -- File Deletion --
        socket.on('deleteFile', async ({ roomId, fileId, fileName }) => {
            try {
                // Broadcast file deletion to other clients
                socket.to(roomId).emit('fileDeleted', { fileId, fileName });

                // Create activity for file deletion
                try {
                    const room = await Room.findById(roomId).select('name');
                    const roomName = room?.name || 'Unknown Room';

                    // Get user info from socket
                    const user = socket.user || { username: 'User', _id: null };

                    const deleteActivity = await Activity.create({
                        room: roomId,
                        user: user._id,
                        type: 'file_deleted',
                        description: `${user.username || 'User'} deleted file "${fileName}" in ${roomName}`,
                        metadata: {
                            filename: fileName,
                            roomName,
                            fileId: fileId
                        }
                    });

                    // Emit socket event for new activity (global for dashboard)
                    const populatedDeleteActivity = await Activity.findById(deleteActivity._id)
                        .populate('user', 'username email')
                        .populate('room', 'name');
                    io.emit('activityCreated', populatedDeleteActivity);

                    console.log(`Created activity for file deletion: ${fileName} in room ${roomId}`);
                } catch (activityError) {
                    console.error('Error creating file deletion activity:', activityError);
                }

                // Delete file from database
                await File.findByIdAndDelete(fileId);
                console.log(`File ${fileId} deleted from database`);
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        });

        // -- File Renaming --
        socket.on('renameFile', async ({ roomId, fileId, oldName, newName }) => {
            try {
                // Broadcast file rename to other clients
                socket.to(roomId).emit('fileRenamed', { fileId, oldName, newName });

                // Create activity for file renaming
                try {
                    const room = await Room.findById(roomId).select('name');
                    const roomName = room?.name || 'Unknown Room';

                    // Get user info from socket
                    const user = socket.user || { username: 'User', _id: null };

                    const renameActivity = await Activity.create({
                        room: roomId,
                        user: user._id,
                        type: 'file_renamed',
                        description: `${user.username || 'User'} renamed file "${oldName}" to "${newName}" in ${roomName}`,
                        metadata: {
                            filename: newName,
                            oldName: oldName,
                            roomName,
                            fileId: fileId
                        }
                    });

                    // Emit socket event for new activity (global for dashboard)
                    const populatedRenameActivity = await Activity.findById(renameActivity._id)
                        .populate('user', 'username email')
                        .populate('room', 'name');
                    io.emit('activityCreated', populatedRenameActivity);

                    console.log(`Created activity for file rename: ${oldName} -> ${newName} in room ${roomId}`);
                } catch (activityError) {
                    console.error('Error creating file rename activity:', activityError);
                }

                // Update file name in database
                await File.findByIdAndUpdate(fileId, { name: newName });
                console.log(`File ${fileId} renamed from "${oldName}" to "${newName}" in database`);
            } catch (error) {
                console.error('Error renaming file:', error);
            }
        });

        // Handle message updates
        socket.on("updateMessage", async (updatedMessage) => {
            try {
                // Find the message first to check ownership
                const message = await Chat.findById(updatedMessage.messageId);

                if (!message) {
                    console.error('Message not found:', updatedMessage.messageId);
                    return;
                }

                // Check if the current user is the sender of the message
                if (message.sender.toString() !== updatedMessage.userId.toString()) {
                    console.error('Unauthorized message update attempt');
                    return;
                }

                const chat = await Chat.findByIdAndUpdate(
                    updatedMessage.messageId,
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
        socket.on("deleteMessage", async (deleteData) => {
            try {
                // Find the message first to check ownership
                const message = await Chat.findById(deleteData.messageId);

                if (!message) {
                    console.error('Message not found:', deleteData.messageId);
                    return;
                }

                // Check if the current user is the sender of the message
                if (message.sender.toString() !== deleteData.userId.toString()) {
                    console.error('Unauthorized message deletion attempt');
                    return;
                }

                // Delete the message
                await Chat.findByIdAndDelete(deleteData.messageId);

                // Emit deletion event to all users in the room
                io.to(deleteData.roomId).emit("messageDeleted", { messageId: deleteData.messageId });

            } catch (error) {
                console.error("Error deleting message:", error);
            }
        });

        // Handle code execution
        socket.on("executeCode", async (data) => {
            try {
                const { roomId, code, language, fileName, user } = data;

                // Get user info from data payload or socket
                const userInfo = user || socket.user || { username: 'User', _id: null };

                // Broadcast code execution to other users in room
                socket.to(roomId).emit("codeExecuting", {
                    user: userInfo.username || 'User',
                    code: code,
                    language: language,
                    fileName: fileName,
                    timestamp: new Date()
                });

                // Create activity for code execution
                try {
                    const room = await Room.findById(roomId).select('name');
                    const roomName = room?.name || 'Unknown Room';

                    const codeActivity = await Activity.create({
                        room: roomId,
                        user: userInfo._id,
                        type: 'code_executed',
                        description: `${userInfo.username || 'User'} executed code "${fileName || 'script'}" in ${roomName}`,
                        metadata: {
                            filename: fileName,
                            language: language,
                            roomName,
                            executionTime: null, // Will be updated when execution completes
                            exitCode: null // Will be updated when execution completes
                        }
                    });

                    // Emit socket event for new activity (global for dashboard)
                    const populatedCodeActivity = await Activity.findById(codeActivity._id)
                        .populate('user', 'username email')
                        .populate('room', 'name');
                    io.emit('activityCreated', populatedCodeActivity);

                    console.log(`Created activity for code execution: ${fileName} in room ${roomId}`);
                } catch (activityError) {
                    console.error('Error creating code execution activity:', activityError);
                }

                // Simulate code execution (replace with actual execution logic)
                setTimeout(async () => {
                    const executionTime = Math.floor(Math.random() * 1000) + 100; // Random 100-1100ms
                    const exitCode = Math.random() > 0.8 ? 1 : 0; // 80% success rate

                    // Update the activity with execution results
                    try {
                        const activities = await Activity.find({
                            room: roomId,
                            user: userInfo._id,
                            type: 'code_executed'
                        }).sort({ createdAt: -1 }).limit(1);

                        if (activities.length > 0) {
                            const activity = activities[0];
                            activity.metadata.executionTime = executionTime;
                            activity.metadata.exitCode = exitCode;
                            activity.description = `${userInfo.username || 'User'} executed code "${fileName || 'script'}" ${exitCode === 0 ? 'successfully' : 'with errors'} in ${executionTime}ms in ${roomName}`;
                            await activity.save();
                        }

                        // Broadcast execution results to all users in room
                        io.to(roomId).emit("codeExecuted", {
                            user: userInfo.username || 'User',
                            fileName: fileName,
                            executionTime: executionTime,
                            exitCode: exitCode,
                            success: exitCode === 0,
                            timestamp: new Date()
                        });
                    } catch (updateError) {
                        console.error('Error updating code execution activity:', updateError);
                    }
                }, 1000); // Simulate 1 second execution time

            } catch (error) {
                console.error("Error handling code execution:", error);
            }
        });

        // Disconnect
        socket.on("disconnect", () => {
            console.log("Client disconnected : ", socket.id);

            // Note: We can't reliably determine which specific user disconnected
            // without maintaining socket.id -> user mappings. For now, we'll
            // just clear the in-memory state. The participants in the database
            // will be cleaned up when users explicitly leave rooms or when
            // the server restarts and loads fresh data.
            Object.keys(roomUsers).forEach(roomId => {
                if (roomUsers[roomId]) {
                    roomUsers[roomId].clear();
                }
            });
        })
    })
}

module.exports = socketHandler;