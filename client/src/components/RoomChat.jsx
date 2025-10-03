import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import useAuthContext from "../hooks/useAuthContext";
import { MoreVertical, Edit2, Trash2, Check, X } from "lucide-react";

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

    socket.on('chatHistory', handleChatHistory);

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
        <div className="mt-2 text-xs text-gray-400">
          {users.length} {users.length === 1 ? 'person' : 'people'} online
        </div>
      </div>
    </div>
  );
};

export default RoomChat;
