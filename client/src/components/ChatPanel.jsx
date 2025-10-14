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
  const [showMessageMenu, setShowMessageMenu] = useState(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEditStart = (message) => {
    setEditingMessageId(message._id);
    onInputChange(message.message); // Use main input box
    setShowMessageMenu(null);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    onInputChange(""); // Clear input
  };

  const handleEditSave = () => {
    if (inputValue.trim() && onEditMessage && editingMessageId) {
      onEditMessage(editingMessageId, inputValue.trim());
      setEditingMessageId(null);
      onInputChange(""); // Clear input after save
    }
  };

  const handleDelete = (messageId) => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
    }
    setShowMessageMenu(null);
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
      <div className="fixed right-0 top-0 h-full w-96 bg-[#1E1E1E] border-l border-gray-800 transform transition-transform duration-300 translate-x-0 z-20 flex flex-col">
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-[#1E1E1E] flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span className="text-sm font-semibold">Room Chat</span>
          </div>
          <button onClick={onToggleChat} className="p-1 rounded hover:bg-gray-800" aria-label="Close Chat">
            <X size={16} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3" style={{ height: 'calc(100vh - 14rem)' }}>
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
                        <div className="absolute top-6 right-0 w-28 bg-[#2D2D2D] rounded-md shadow-xl z-50 border border-gray-700 message-menu-container overflow-hidden">
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

                {/* Message content */}
                {isEditing ? (
                  <div className="w-full px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200">
                    <div className="flex items-center gap-2">
                      <Edit size={14} />
                      <span>Editing... Use input box below</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
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
        <div className="border-t border-gray-800 bg-[#1E1E1E] p-4 flex-shrink-0">
          {editingMessageId && (
            <div className="mb-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit size={14} />
                <span>Editing message</span>
              </div>
              <button
                onClick={handleEditCancel}
                className="text-yellow-200 hover:text-yellow-100"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (editingMessageId) {
                    handleEditSave();
                  } else {
                    onSendMessage();
                  }
                } else if (e.key === "Escape" && editingMessageId) {
                  handleEditCancel();
                }
              }}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#2D2D2D] border border-gray-700 outline-none text-gray-200 placeholder-gray-500 focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-colors"
              placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
            />
            <button
              onClick={editingMessageId ? handleEditSave : onSendMessage}
              disabled={!inputValue.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold inline-flex items-center gap-2 hover:bg-[#8B5CF6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#A78BFA]/20"
            >
              {editingMessageId ? (
                <>
                  <Edit size={16} />
                  Update
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      
    </>
  );
};

export default ChatPanel;
