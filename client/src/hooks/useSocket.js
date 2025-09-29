import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket(roomId) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io("http://localhost:4000"); 
    setSocket(s);

    if (roomId) {
      s.emit("joinRoom", roomId);
    }

    return () => {
      s.disconnect();
    };
  }, [roomId]);

  return socket;
}
