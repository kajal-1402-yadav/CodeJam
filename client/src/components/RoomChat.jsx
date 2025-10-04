import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import useAuthContext from "../hooks/useAuthContext";
import { MoreVertical, Edit2, Trash2, Check, X, Users } from "lucide-react";

const MessageMenu = ({ onEdit, onDelete, isOwner }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOwner) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
      >
        <MoreVertical size={16} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-[#2D2D2D] rounded-md shadow-lg z-10 border border-gray-700">
          <button
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
          >
            <Edit2 size={14} className="mr-2" /> Edit
          </button>
          <button
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
          >
            <Trash2 size={14} className="mr-2" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

const RoomChat = ({ roomId }) => {
  const socket = useSocket();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editInput, setEditInput] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // join room with user info
    socket.emit("joinRoom", {
      roomId,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username
      }
    });

    // Handle receiving chat history when joining a room
    const handleChatHistory = (history) => {
      setMessages(history);
    };

    // Listen for ephemeral notifications (temporary activities)
    const handleUserJoined = (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'user_joined',
        message: `${data.user} joined the room`,
        timestamp: data.timestamp
      }]);
    };

    const handleUserLeft = (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'user_left',
        message: `${data.user} left the room`,
        timestamp: data.timestamp
      }]);
    };

    socket.on('chatHistory', handleChatHistory);
    socket.on('userJoinedNotification', handleUserJoined);
    socket.on('userLeftNotification', handleUserLeft);

    // Listen for messages
    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, { ...msg, _id: Date.now().toString() }]);
    };

    // Listen for message updates
    const handleMessageUpdate = (updatedMsg) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === updatedMsg._id ? { ...msg, ...updatedMsg } : msg
        )
      );
    };

    // Listen for message deletion
    const handleMessageDelete = (deletedMsgId) => {
      setMessages(prev => prev.filter(msg => msg._id !== deletedMsgId));
    };

    socket.on("receiveMessage", handleNewMessage);
    socket.on("messageUpdated", handleMessageUpdate);
    socket.on("messageDeleted", handleMessageDelete);

    // Listen for presence updates
    socket.on("roomUsers", (list) => {
      setUsers(list);
    });

    // Auto-remove notifications after 5 seconds
    const notificationInterval = setInterval(() => {
      setNotifications(prev => prev.filter(n => Date.now() - n.id < 5000));
    }, 1000);

    // Clean up
    return () => {
      socket.emit("leaveRoom", {
        roomId,
        user: {
          _id: user._id,
          email: user.email,
          username: user.username
        }
      });
      socket.off("receiveMessage", handleNewMessage);
      socket.off("messageUpdated", handleMessageUpdate);
      socket.off("messageDeleted", handleMessageDelete);
      socket.off("roomUsers");
      socket.off('chatHistory', handleChatHistory);
      socket.off('userJoinedNotification', handleUserJoined);
      socket.off('userLeftNotification', handleUserLeft);
      clearInterval(notificationInterval);
    };
  }, [socket, roomId, user]);

  const sendMessage = () => {
    if (input.trim() && socket && user) {
      const messageData = {
        _id: Date.now().toString(),
        roomId,
        message: input,
        sender: { 
          _id: user._id, 
          username: user.username 
        },
        createdAt: new Date().toISOString(),
        isEdited: false
      };
      
      socket.emit("sendMessage", messageData);
      setInput("");
    }
  };

  const updateMessage = () => {
    if (editInput.trim() && editingMessage) {
      const updatedMessage = {
        ...editingMessage,
        message: editInput,
        isEdited: true,
        updatedAt: new Date().toISOString()
      };
      
      socket.emit("updateMessage", updatedMessage);
      setEditingMessage(null);
      setEditInput("");
    }
  };

  const deleteMessage = (messageId) => {
    if (socket && messageId) {
      socket.emit("deleteMessage", { messageId, roomId });
    }
  };

  const startEditing = (message) => {
    setEditingMessage(message);
    setEditInput(message.message);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setEditInput("");
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Ephemeral Notifications */}
      <div className="flex-shrink-0 p-4 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-3 py-2 rounded-lg text-sm text-white transition-all duration-300 ${
              notification.type === 'user_joined'
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-gray-500/20 border border-gray-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                notification.type === 'user_joined' ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              <span>{notification.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isCurrentUser = msg.sender?._id === user._id;
          return (
            <div 
              key={msg._id || msg.timestamp} 
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 relative group ${
                  isCurrentUser 
                    ? 'bg-[#A78BFA] text-[#1E1E1E] rounded-br-none' 
                    : 'bg-[#2D2D2D] text-gray-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">
                    {isCurrentUser ? 'You' : msg.sender?.username || 'Unknown'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs opacity-70">
                      {formatTime(msg.createdAt)}
                    </span>
                    <MessageMenu
                      onEdit={() => startEditing(msg)}
                      onDelete={() => deleteMessage(msg._id)}
                      isOwner={isCurrentUser}
                    />
                  </div>
                </div>
                <div className="break-words">
                  {editingMessage?._id === msg._id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        className="w-full px-2 py-1 bg-white/10 rounded text-white"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={updateMessage}
                          className="p-1 text-green-400 hover:text-green-300"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p>{msg.message}</p>
                      {msg.isEdited && (
                        <span className="text-xs opacity-50 block mt-1">(edited)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 p-3 bg-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 px-4 py-2 rounded-lg bg-[#2D2D2D] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition-colors"
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {users.length} {users.length === 1 ? 'person' : 'people'} online
          </span>
          <button
            onClick={() => setShowParticipantsModal(true)}
            className="text-xs text-[#A78BFA] hover:text-white flex items-center gap-1 transition-colors"
          >
            <Users size={12} />
            View all
          </button>
        </div>
      </div>

      {/* Participants Modal */}
      <ParticipantsModal
        users={users}
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        currentUser={user}
      />
    </div>
  );
};

// Participants Modal Component
const ParticipantsModal = ({ users, isOpen, onClose, currentUser }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Room Participants</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No participants online</p>
          ) : (
            users.map((userEmail, index) => {
              const isCurrentUser = userEmail === currentUser?.email;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isCurrentUser
                      ? 'bg-[#A78BFA]/10 border-[#A78BFA]/30'
                      : 'bg-[#2D2D2D] border-gray-700 hover:bg-gray-700/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isCurrentUser
                      ? 'bg-[#A78BFA] text-[#1E1E1E]'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {userEmail.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrentUser ? 'text-[#A78BFA]' : 'text-white'}`}>
                      {userEmail}
                      {isCurrentUser && <span className="text-xs text-gray-400 ml-2">(You)</span>}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${isCurrentUser ? 'bg-[#A78BFA]' : 'bg-green-500'}`} />
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            {users.length} {users.length === 1 ? 'participant' : 'participants'} online
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoomChat;
export { ParticipantsModal };
