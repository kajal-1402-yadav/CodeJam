import { useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";

const ChatPanel = ({
  isOpen,
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onToggleChat,
  currentUser
}) => {
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed right-0 top-0 h-full w-96 bg-[#1E1E1E]/90 border-l border-gray-800 transform transition-transform duration-300 translate-x-0 z-20">
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-3 bg-[#1E1E1E]/50">
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

            return (
              <div
                key={m._id}
                className={`flex flex-col max-w-[75%] ${
                  isSelf ? "ml-auto items-end" : "items-start"
                }`}
              >
                {/* Sender + Time */}
                <div className="text-xs text-gray-400 mb-1">
                  <span className="font-semibold text-gray-300">
                    {m?.sender?.username || m?.sender?.email || "User"}
                  </span>
                  <span className="ml-2">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {m.isEdited && (
                    <span className="ml-1 text-xs text-gray-500">
                      (edited)
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    isSelf
                      ? "bg-[#A78BFA] text-[#1E1E1E]"
                      : "bg-[#1E1E1E] border border-gray-800 text-gray-100"
                  }`}
                >
                  {m.message}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-gray-800 flex items-center gap-2">
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

      {/* Chat edge toggle */}
      <button
        onClick={onToggleChat}
        className="fixed top-1/2 -translate-y-1/2 right-96 p-1 rounded-l bg-[#1E1E1E]/50 border border-gray-800 transition-transform duration-300 z-20"
        aria-label="Toggle Chat"
      >
        <X size={16} />
      </button>
    </>
  );
};

export default ChatPanel;
