import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(import.meta.env.VITE_API_URL || "http://localhost:4000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      transports: ["websocket", "polling"]
    });

    s.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    s.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
    });

    s.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason);
    });

    setSocket(s);

    return () => {
      if (s.connected) {
        s.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
