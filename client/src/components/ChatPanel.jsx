import { useRef, useEffect, useState } from "react";
import { MessageSquare, X, Send, Edit, Trash2, MoreVertical } from "lucide-react";

const ChatPanel = ({
  isOpen,
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onToggleChat,
  onEditMessage,
  onDeleteMessage,
  currentUser
}) => {
  const chatEndRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [showMessageMenu, setShowMessageMenu] = useState(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEditStart = (message) => {
    setEditingMessageId(message._id);
    setEditingText(message.message);
    setShowMessageMenu(null);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleEditSave = () => {
    if (editingText.trim() && onEditMessage) {
      onEditMessage(editingMessageId, editingText.trim());
    }
    handleEditCancel();
  };

  // Close message menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMessageMenu && !event.target.closest('.message-menu-container')) {
        setShowMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMessageMenu]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed  right-0 top-0 h-full w-96 bg-[#1E1E1E]/90 border-l border-gray-800 transform transition-transform duration-300 translate-x-0 z-20">
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-3 bg-[#1E1E1E]/5">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span className="text-sm font-semibold">Room Chat</span>
          </div>
          <button onClick={onToggleChat} className="p-1 rounded hover:bg-gray-800" aria-label="Close Chat">
            <X size={16} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3">
          {messages.map((m) => {
            const isSelf =
              m?.sender?._id === currentUser?._id ||
              m?.sender?.email === currentUser?.email;
            const isEditing = editingMessageId === m._id;

            return (
              <div
                key={m._id}
                className={`flex flex-col max-w-[75%] ${
                  isSelf ? "ml-auto items-end" : "items-start"
                }`}
              >
                {/* Sender + Time + Menu */}
                <div className={`flex items-center text-xs text-gray-400 mb-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                  <span className="font-semibold text-gray-300">
                    {m?.sender?.username || m?.sender?.email || "User"}
                  </span>
                  <span className="ml-2">
                    {new Date(m.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {m.isEdited && (
                    <span className="ml-1 text-xs text-gray-500">
                      (edited)
                    </span>
                  )}

                  {/* Message actions menu - only show for own messages */}
                  {isSelf && !isEditing && (
                    <div className="relative ml-2">
                      <button
                        onClick={() => setShowMessageMenu(showMessageMenu === m._id ? null : m._id)}
                        className="p-1 rounded hover:bg-gray-600 transition-colors"
                        aria-label="Message options"
                      >
                        <MoreVertical size={12} />
                      </button>

                      {/* Dropdown menu */}
                      {showMessageMenu === m._id && (
                        <div className="absolute top-6 right-0 w-24 bg-[#2D2D2D] rounded-md shadow-lg z-10 border border-gray-700 message-menu-container">
                          <button
                            onClick={() => handleEditStart(m)}
                            className="flex items-center w-full px-3 py-2 text-xs text-gray-200 hover:bg-gray-700"
                          >
                            <Edit size={12} className="mr-2" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(m._id)}
                            className="flex items-center w-full px-3 py-2 text-xs text-red-400 hover:bg-gray-700"
                          >
                            <Trash2 size={12} className="mr-2" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Message content - either editing or display mode */}
                {isEditing ? (
                  <div className="w-full">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-[#1E1E1E] border border-gray-600 outline-none text-gray-200 text-sm resize-none"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEditSave();
                        } else if (e.key === 'Escape') {
                          handleEditCancel();
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleEditSave}
                        className="px-3 py-1 text-xs bg-[#A78BFA] text-[#1E1E1E] rounded hover:bg-purple-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="px-3 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                      isSelf
                        ? "bg-[#A78BFA] text-[#1E1E1E]"
                        : "bg-[#1E1E1E] border border-gray-800 text-gray-100"
                    }`}
                  >
                    {m.message}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="fixed bottom-0 right-0 w-96 bg-[#1E1E1E]/95 border-l border-gray-800 flex items-center gap-2 p-3 z-30">
        <input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            className="flex-1 px-3 py-2 rounded-md bg-[#1E1E1E] border border-gray-800 outline-none text-gray-200 placeholder-gray-400"
            placeholder="Type a message..."
          />
          <button
            onClick={onSendMessage}
            className="px-4 py-2 rounded-md bg-[#A78BFA] text-[#1E1E1E] font-medium inline-flex items-center gap-2 hover:bg-purple-500"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      
    </>
  );
};

export default ChatPanel;
