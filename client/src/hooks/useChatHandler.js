import { useState, useEffect, useCallback, useRef } from "react";
import useAuthContext from "./useAuthContext";

export function useChatHandler(socket, roomId) {
    const { user } = useAuthContext();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const didWelcome = useRef(false);

    useEffect(() => {
        if (!socket) return;

        const handleChatHistory = (history) => {
            const list = history || [];
            if (!didWelcome.current) {
                didWelcome.current = true;
                const welcome = {
                    _id: `welcome-${roomId}`,
                    sender: { username: "System" },
                    message: "Welcome to the room! Share files, edit code, and chat in real-time.",
                    createdAt: new Date().toISOString(),
                };
                setChatMessages([welcome, ...list]);
            } else {
                setChatMessages(list);
            }
        };

        const handleReceiveMessage = (msg) => setChatMessages((prev) => [...prev, msg]);
        const handleMessageUpdated = (msg) => setChatMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
        const handleMessageDeleted = ({ messageId }) => setChatMessages((prev) => prev.filter((m) => m._id !== messageId));

        socket.on("chatHistory", handleChatHistory);
        socket.on("receiveMessage", handleReceiveMessage);
        socket.on("messageUpdated", handleMessageUpdated);
        socket.on("messageDeleted", handleMessageDeleted);

        return () => {
            socket.off("chatHistory", handleChatHistory);
            socket.off("receiveMessage", handleReceiveMessage);
            socket.off("messageUpdated", handleMessageUpdated);
            socket.off("messageDeleted", handleMessageDeleted);
        };
    }, [socket, roomId]);

    const sendMessage = () => {
        const trimmed = chatInput.trim();
        if (!trimmed || !socket) return;
        socket.emit("sendMessage", { roomId, message: trimmed, sender: user });
        setChatInput("");
    };

    const handleEditMessage = (messageId, newMessage) => socket.emit("updateMessage", { roomId, messageId, message: newMessage, userId: user._id });
    const handleDeleteMessage = (messageId) => socket.emit("deleteMessage", { roomId, messageId, userId: user._id });

    return { isChatOpen, setIsChatOpen, chatMessages, chatInput, setChatInput, sendMessage, handleEditMessage, handleDeleteMessage };
}