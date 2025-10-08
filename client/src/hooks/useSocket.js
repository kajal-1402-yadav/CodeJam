import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import useAuthContext from "./useAuthContext";

export default function useSocket(roomId) {
  const [socket, setSocket] = useState(null);
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) return;

    const s = io("http://localhost:4000");

    // Join room with user data when both socket and roomId are available
    if (roomId && user) {
      s.emit("joinRoom", {
        roomId,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        }
      });
    }

    setSocket(s);

    return () => {
      if (roomId && user) {
        s.emit("leaveRoom", {
          roomId,
          user: {
            _id: user._id,
            email: user.email
          }
        });
      }
      s.disconnect();
    };
  }, [roomId, user]);

  return socket;
}
