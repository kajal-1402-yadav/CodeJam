import RoomChat from "../components/RoomChat";
import { useAuthContext } from "../hooks/useAuthContext";

const RoomPage = ({ roomId }) => {
  const { user } = useAuthContext();

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">Room: {roomId}</h2>
        {/* You can add file editor, terminal, etc. here */}
      </div>
      <div className="w-1/3">
        <RoomChat roomId={roomId} user={user} />
      </div>
    </div>
  );
};

export default RoomPage;
