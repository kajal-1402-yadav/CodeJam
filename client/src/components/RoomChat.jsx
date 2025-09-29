import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import useAuthContext from "../hooks/useAuthContext";

const RoomChat = ({ roomId }) => {
  const socket = useSocket();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // join room with user info
    socket.emit("joinRoom", { roomId, user });

    // listen for messages
    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // listen for presence updates
    socket.on("roomUsers", (list) => {
      setUsers(list);
    });

    return () => {
      socket.emit("leaveRoom", { roomId, user });
      socket.off("receiveMessage");
      socket.off("roomUsers");
    };
  }, [socket, roomId, user]);

  const sendMessage = () => {
    if (input.trim() && socket) {
      socket.emit("sendMessage", { roomId, sender: user.email, message: input });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className="bg-[#111111] border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">{m.sender}</div>
            <div className="text-gray-200">{m.message}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-800 p-2">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-md bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 rounded-md bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">Online: {users.length}</div>
      </div>
    </div>
  );
};

export default RoomChat;
