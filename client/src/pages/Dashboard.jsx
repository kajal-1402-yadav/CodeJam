import { useState, useEffect } from "react";
import { Users, Bell, Plus, Search, Loader2, X, ExternalLink, Home, LogIn } from "lucide-react";
import Sidebar from "../components/Sidebar";
import useAuthContext from "../hooks/useAuthContext";
import useSocket from "../hooks/useSocket";
import { useNavigate } from "react-router-dom";
import { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom } from "../services/roomService";
import { getFilesByRoom, getMyFiles } from "../services/fileService";
import { getActivities } from "../services/activityService";

// Constants
const MAX_DISPLAY_ACTIVITIES = 5;
const MAX_FETCH_ACTIVITIES = 100;

// Helper function to capitalize first letter of each word
const capitalizeFirstLetters = (str) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Dashboard Statistics Component
 * Displays quick stats about user activity and collaboration
 */
const QuickStats = ({ rooms = [], filesCount = 0, user, activities = [] }) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeRooms = new Set();
  activities.forEach(activity => {
    if (new Date(activity.createdAt) >= sevenDaysAgo) {
      activeRooms.add(activity.room?._id || activity.room);
    }
  });

  const allCollaborators = new Set();
  rooms.forEach(room => {
    if (room.participants && Array.isArray(room.participants)) {
      room.participants.forEach(participant => {
        allCollaborators.add(participant._id || participant);
      });
    }
  });

  const stats = [
    {
      label: "Active Rooms",
      value: activeRooms.size,
      icon: Home
    },
    {
      label: "Files Shared",
      value: filesCount,
      icon: LogIn
    },
    {
      label: "Collaborators Connected",
      value: allCollaborators.size,
      icon: Users
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={index}
            className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg transform hover:scale-105 transition-transform duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                <p className="text-white text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className="p-3 rounded-full bg-[#A78BFA]/10 text-[#A78BFA]">
                <IconComponent size={22} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Room Card Component
 * Displays individual room information with actions
 */
const RoomCard = ({ room, onJoin, user }) => {
  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-md flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300 group relative room-card">
      <div className="relative">
        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#A78BFA] transition-colors pr-8">{room.name}</h3>
        <p className="text-gray-400 text-sm">Collaborators: {room.participants}</p>
        {room.createdBy && String(room.createdBy._id) !== String(user._id) && (
          <p className="text-gray-400 text-sm">Created by: {room.createdBy.username}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">Created: {room.createdAt}</p>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={() => onJoin(room)}
          className="flex-1 rounded-lg bg-[#A78BFA] px-4 py-2 text-sm font-bold text-[#1E1E1E] hover:bg-[#A78BFA]/90 transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink size={16} />
          Join
        </button>
      </div>
    </div>
  );
};

/**
 * Main Dashboard Component
 * Provides an overview of user's rooms, activities, and quick stats
 */
const Dashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const [filesCount, setFilesCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [userFiles, setUserFiles] = useState([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const socket = useSocket();

  // Fetch rooms from backend
  useEffect(() => {
    fetchRooms();
  }, []);

  // Fetch files uploaded by user
  useEffect(() => {
    if (user) {
      fetchUserFiles();
    }
  }, [user]);

  // Fetch recent activities
  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('activityCreated', (newActivity) => {
        setActivities(prev => {
          if (prev.find(activity => activity._id === newActivity._id)) {
            return prev;
          }
          return [newActivity, ...prev.slice(0, MAX_DISPLAY_ACTIVITIES - 1)];
        });
      });

      socket.on('roomParticipantsUpdated', (data) => {
        const { roomId, participants } = data;
        setRooms(prev => prev.map(room =>
          String(room._id) === String(roomId)
            ? { ...room, participants }
            : room
        ));
      });

      socket.on('roomDeleted', (data) => {
        setRooms(prev => prev.filter(room => String(room._id) !== String(data.roomId)));
      });
    }

    return () => {
      if (socket) {
        socket.off('activityCreated');
        socket.off('roomParticipantsUpdated');
        socket.off('roomDeleted');
      }
    };
  }, [socket, user]);

  const fetchUserFiles = async () => {
    try {
      const result = await getMyFiles();

      if (result.success) {
        setUserFiles(result.data);
        setFilesCount(result.data.length);
      } else {
        console.error('Error fetching user files:', result.error);
      }
    } catch (error) {
      console.error('Error fetching user files:', error);
    }
  };

  const fetchActivities = async () => {
    const result = await getActivities({ limit: MAX_FETCH_ACTIVITIES });

    if (result.success) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivities = result.data.filter(activity =>
        new Date(activity.createdAt) >= sevenDaysAgo
      );

      const uniqueActivities = recentActivities.filter((activity, index, self) =>
        index === self.findIndex(a => a._id === activity._id)
      );

      setActivities(uniqueActivities.slice(0, MAX_DISPLAY_ACTIVITIES));
    } else {
      console.error('Error fetching activities:', result.error);
    }
  };

  const fetchRooms = async () => {
    setIsLoading(true);

    try {
      const result = await getAllRooms();

      if (result.success) {
        setRooms(result.data);
      } else {
        console.error('Error fetching rooms:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('Error in fetchRooms:', error);
      setError('Failed to load dashboard');
    }

    setIsLoading(false);
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.createdBy && room.createdBy.username && room.createdBy.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [createError, setCreateError] = useState("");

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const trimmedName = newRoomName.trim().toLowerCase();
    const existingRoom = rooms.find(room =>
      room.name.toLowerCase() === trimmedName
    );

    if (existingRoom) {
      setCreateError("A room with this name already exists. Please choose a different name.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    const result = await createRoom({
      name: newRoomName.trim(),
      createdBy: user._id
    });

    if (result.success) {
      setRooms(prev => {
        const exists = prev.some(room => room._id === result.data._id);
        if (exists) {
          return prev;
        }
        return [result.data, ...prev];
      });
      setNewRoomName("");
      setCreateError("");
      setShowCreateModal(false);
    } else {
      console.error('Error creating room:', result.error);
      if (result.error.includes("already exists")) {
        setCreateError(result.error);
      } else {
        setCreateError("Failed to create room. Please try again.");
      }
    }

    setIsCreating(false);
  };

  const handleJoinRoom = (room) => {
    navigate(`/room/${room._id}`);
  };

  const handleJoinRoomModal = () => {
    setShowJoinModal(true);
    setRoomCode("");
    setJoinError("");
  };

  const handleJoinRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setJoinError("Please enter a room ID or code");
      return;
    }

    setIsJoining(true);
    setJoinError("");

    const result = await getRoomById(roomCode.trim());

    if (!result.success) {
      setJoinError('Room not found. Please check the room ID.');
      setIsJoining(false);
      return;
    }

    const roomData = result.data;

    if (roomData.createdBy === user._id || (Array.isArray(roomData.participants) && roomData.participants.some(p => String(p._id) === String(user._id)))) {
      setJoinError("You're already a member of this room.");
      setIsJoining(false);
      return;
    }

    if (socket) {
      try {
        const joinPromise = new Promise((resolve, reject) => {
          const handleUserJoinedRoom = (data) => {
            const { roomId, room } = data;
            if (roomId === roomData._id) {
              setRooms(prev => {
                const roomExists = prev.some(r => String(r._id) === String(roomId));
                if (roomExists) {
                  return prev.map(r =>
                    String(r._id) === String(roomId) ? { ...r, ...room } : r
                  );
                } else {
                  return [room, ...prev];
                }
              });
              socket.off('userJoinedRoom', handleUserJoinedRoom);
              resolve(room);
            }
          };

          socket.on('userJoinedRoom', handleUserJoinedRoom);

          setTimeout(() => {
            socket.off('userJoinedRoom', handleUserJoinedRoom);
            reject(new Error('Join room timeout'));
          }, 5000);

          socket.emit("joinRoom", {
            roomId: roomData._id,
            user: {
              _id: user._id,
              username: user.username,
              email: user.email
            }
          });
        });

        await joinPromise;
        navigate(`/room/${roomData._id}`);
        setShowJoinModal(false);

      } catch (error) {
        console.error('Error joining room:', error);
        setJoinError('Failed to join room. Please try again.');
      }
    } else {
      setJoinError('Connection error. Please try again.');
    }

    setIsJoining(false);
  };

  const handleEditRoom = (room) => {
    const newName = prompt("Enter new room name:", room.name);
    if (newName && newName.trim() !== room.name) {
      handleUpdateRoom(room._id, { name: newName.trim() });
    }
  };

  const handleUpdateRoom = async (roomId, updateData) => {
    if (updateData.name) {
      const trimmedName = updateData.name.trim().toLowerCase();
      const existingRoom = rooms.find(room =>
        room._id !== roomId && room.name.toLowerCase() === trimmedName
      );

      if (existingRoom) {
        setError("A room with this name already exists. Please choose a different name.");
        return;
      }
    }

    const result = await updateRoom(roomId, updateData);

    if (result.success) {
      setRooms(prev => prev.map(room => room._id === roomId ? result.data : room));
    } else {
      console.error('Error updating room:', result.error);
      if (result.error.includes("already exists")) {
        setError(result.error);
      } else {
        setError("Failed to update room. Please try again.");
      }
    }
  };

  const handleDeleteRoom = (room) => {
    setRoomToDelete(room);
    setShowDeleteModal(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;

    setIsDeleting(true);

    const result = await deleteRoom(roomToDelete._id);

    if (result.success) {
      setRooms(prev => prev.filter(r => r._id !== roomToDelete._id));
      setShowDeleteModal(false);
      setRoomToDelete(null);
    } else {
      console.error('Error deleting room:', result.error);
      setError(result.error);
    }

    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading dashboard...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
      <Sidebar />

      <main className="flex-1 p-8 ml-64">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
            <p className="text-gray-400 mt-1">Here's a snapshot of your collaborative world.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-initial">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search rooms by name or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-2.5 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl bg-[#A78BFA] px-6 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors inline-flex items-center gap-2"
              >
                <Plus size={16} /> Create Room
              </button>
              <button
                onClick={handleJoinRoomModal}
                className="rounded-xl bg-[#A78BFA]/20 px-6 py-3 text-base font-bold text-white border border-purple-500/30 ring-1 ring-inset ring-[#A78BFA]/30 hover:bg-[#A78BFA]/30 transition-colors"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>

        <QuickStats rooms={filteredRooms} filesCount={filesCount} user={user} activities={activities} />

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 text-red-100 rounded-lg">
            <p>Error: {error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">Recent Rooms</h2>
            <button
              onClick={() => navigate('/rooms')}
              className="px-4 py-2 bg-[#A78BFA] text-[#1E1E1E] rounded-lg hover:bg-[#A78BFA]/90 transition-colors text-sm font-medium flex items-center gap-2"
            >
              View All Rooms
              <ExternalLink size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.slice(0, 3).map((room) => (
              <RoomCard
                key={room._id}
                room={{
                  ...room,
                  participants: Array.isArray(room.participants) ? room.participants.length : 0,
                  createdAt: new Date(room.createdAt).toLocaleDateString()
                }}
                onJoin={handleJoinRoom}
                user={user}
              />
            ))}
          </div>
          {filteredRooms.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-500 mb-4" size={48} />
              {searchQuery ? (
                <>
                  <p className="text-gray-500 text-lg">No rooms found for "{searchQuery}"</p>
                  <p className="text-gray-400 text-sm mt-2">Try a different search term or create a new room</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 px-4 py-2 bg-[#A78BFA] text-[#1E1E1E] rounded-lg hover:bg-[#A78BFA]/90 transition-colors"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg">No rooms found</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first room to get started</p>
                </>
              )}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-5">Recent Activity</h2>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={activity._id || index} className="p-4 rounded-lg bg-[#1E1E1E]/50 border border-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-medium">
                      {activity.user && String(activity.user._id) === String(user._id)
                        ? capitalizeFirstLetters(activity.description.replace(activity.user.username, 'You'))
                        : capitalizeFirstLetters(activity.description)
                      }
                    </span>
                    <span className="text-gray-500 text-sm">
                      {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                  {activity.room && (
                    <div className="text-[#A78BFA] text-sm font-medium">
                      {activity.room.name}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Bell className="mx-auto text-gray-500 mb-4" size={32} />
                <p className="text-gray-500 text-lg">No recent activity</p>
                <p className="text-gray-400 text-sm mt-2">Activity will appear here as you collaborate in rooms</p>
              </div>
            )}
          </div>
        </section>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Create New Room</h3>
              <form onSubmit={handleCreateRoom}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => {
                      setNewRoomName(e.target.value);
                      setCreateError("");
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                    placeholder="Enter room name"
                    required
                  />
                  {createError && (
                    <p className="text-red-400 text-sm mt-2">{createError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError("");
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newRoomName.trim()}
                    className="flex-1 px-4 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreating && <Loader2 className="animate-spin" size={16} />}
                    {isCreating ? 'Creating...' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteModal && roomToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Delete Room</h3>
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete <span className="text-white font-semibold">"{roomToDelete.name}"</span>?
              </p>
              <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRoomToDelete(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRoom}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 className="animate-spin" size={16} />}
                  {isDeleting ? 'Deleting...' : 'Delete Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Join Room</h3>
              <p className="text-gray-300 mb-4">
                Enter a room ID to join an existing room. You can get the room ID from the room creator.
              </p>

              <form onSubmit={handleJoinRoomSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                    placeholder="Enter room ID (e.g., 64f7a8b2c3d4e5f6789abcde)"
                    required
                  />
                  {joinError && (
                    <p className="text-red-400 text-sm mt-2">{joinError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                    disabled={isJoining}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isJoining || !roomCode.trim()}
                    className="flex-1 px-4 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isJoining && <Loader2 className="animate-spin" size={16} />}
                    {isJoining ? 'Joining...' : 'Join Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
