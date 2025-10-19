import { useState, useEffect } from "react";
import { Users, FilePlus, Bell, Plus, Search, Loader2, X, ExternalLink, Copy, Edit, Trash2, MoreHorizontal } from "lucide-react";
import Sidebar from "../components/Sidebar";
import useAuthContext from "../hooks/useAuthContext";
import useSocket from "../hooks/useSocket";
import { useNavigate } from "react-router-dom";
import { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom } from "../services/roomService";
import { getFilesByRoom } from "../services/fileService";
import { getActivities } from "../services/activityService";

const QuickStats = ({ rooms = [], filesCount = 0 }) => {
  const totalCollaborators = rooms.reduce((sum, room) => sum + (room.participants?.length || 0), 0);

  const stats = [
    {
      label: "Active Rooms",
      value: rooms.length,
      icon: Users
    },
    {
      label: "Collaborators",
      value: totalCollaborators,
      icon: Users
    },
    {
      label: "Files Shared",
      value: filesCount,
      icon: FilePlus
    }
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={i}
            className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg transform hover:scale-105 transition-transform duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{s.label}</p>
                <p className="text-white text-3xl font-bold mt-1">{s.value}</p>
              </div>
              <div className="p-3 rounded-full bg-[#A78BFA]/10 text-[#A78BFA]">
                <Icon size={22} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RoomCard = ({ room, onJoin, onEdit, onDelete, onCopy, user }) => {
  const [showMenu, setShowMenu] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.room-card')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-md flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300 group relative room-card">
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-0 right-0 p-1 rounded-full hover:bg-gray-700 transition-colors z-10"
        >
          <MoreHorizontal size={16} className="text-gray-400 hover:text-white" />
        </button>

        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#A78BFA] transition-colors pr-8">{room.name}</h3>
        <p className="text-gray-400 text-sm">Collaborators: {room.participants}</p>
        {room.creator && <p className="text-gray-400 text-sm">Created by: {room.creator}</p>}
        <p className="text-gray-500 text-xs mt-1">Created: {room.createdAt}</p>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute top-8 right-0 bg-[#1E1E1E] border border-gray-700 rounded-lg shadow-lg z-20 min-w-[120px]">
            {room.createdBy && String(room.createdBy._id) === String(user._id) && (
              <>
                <button
                  onClick={() => {
                    onEdit(room);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Edit size={14} />
                  Rename
                </button>
                <button
                  onClick={() => {
                    onDelete(room);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={() => onJoin(room)}
          className="flex-1 rounded-lg bg-[#A78BFA] px-4 py-2 text-sm font-bold text-[#1E1E1E] hover:bg-[#A78BFA]/90 transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink size={16} />
          Join
        </button>
        <button
          onClick={() => onCopy(room)}
          className="px-4 py-2 rounded-lg border border-gray-600 text-sm font-bold text-gray-300 hover:border-[#A78BFA] hover:text-white transition-colors flex items-center gap-2"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
};


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

  // New state for real-time data
  const [filesCount, setFilesCount] = useState(0);
  const [activities, setActivities] = useState([]);

  // Toast state for copy notifications
  const [showToast, setShowToast] = useState(false);

  // Delete room state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Join room state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Set up socket connection (no roomId for dashboard - just connect for global events)
  const socket = useSocket();

  // Fetch rooms from backend
  useEffect(() => {
    fetchRooms();
  }, []);

  // Fetch files count from all user's rooms
  useEffect(() => {
    if (user) {
      fetchFilesCount();
    }
  }, [user]);

  // Fetch recent activities
  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (socket) {
      // Listen for new activities
      socket.on('activityCreated', (newActivity) => {
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep only latest 10
      });

      // Listen for room updates (participants joining/leaving)
      socket.on('roomUsers', (users) => {
        // Update room participant counts in real-time
        setRooms(prev => prev.map(room => ({
          ...room,
          participants: users.length // This would need room-specific logic
        })));
      });

      // Listen for room participant updates (when users join/leave)
      socket.on('roomParticipantsUpdated', (data) => {
        const { roomId, participants } = data;
        setRooms(prev => prev.map(room =>
          String(room._id) === String(roomId)
            ? { ...room, participants }
            : room
        ));
      });

      // Listen for current user joining a room (handled in join function now)
      // socket.on('userJoinedRoom', (data) => {
      //   const { roomId, room } = data;
      //   // If this room isn't in our current rooms list, add it
      //   setRooms(prev => {
      //     const roomExists = prev.some(r => r._id === roomId);
      //     if (!roomExists) {
      //       return [room, ...prev];
      //     }
      //     return prev;
      //   });
      // });

      // Listen for room deletions
      socket.on('roomDeleted', (data) => {
        setRooms(prev => prev.filter(room => String(room._id) !== String(data.roomId)));
      });
    }

    return () => {
      if (socket) {
        socket.off('activityCreated');
        socket.off('roomUsers');
        socket.off('roomParticipantsUpdated');
        // socket.off('userJoinedRoom'); // Now handled in join function
        socket.off('roomDeleted');
      }
    };
  }, [socket, user]);

  const fetchFilesCount = async () => {
    try {
      // Get all user's rooms first
      const roomsResult = await getAllRooms();

      if (!roomsResult.success) {
        console.error('Failed to fetch rooms for file count:', roomsResult.error);
        return;
      }

      const userRooms = roomsResult.data;
      let totalFiles = 0;

      // Fetch file count for each room
      for (const room of userRooms) {
        const filesResult = await getFilesByRoom(room._id);
        
        if (filesResult.success) {
          totalFiles += filesResult.data.length;
        } else {
          console.error(`Error fetching files for room ${room._id}:`, filesResult.error);
        }
      }

      setFilesCount(totalFiles);
    } catch (error) {
      console.error('Error fetching files count:', error);
    }
  };

  const fetchActivities = async () => {
    const result = await getActivities({ limit: 10 });
    
    if (result.success) {
      setActivities(result.data);
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

  // Filter rooms created by the user
  const myCreatedRooms = rooms.filter(room =>
    room.createdBy && String(room.createdBy._id) === String(user._id) &&
    (room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (room.createdBy && room.createdBy.username && room.createdBy.username.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Filter rooms joined by the user (rooms where user has been active, not just currently participating)
  const myJoinedRooms = rooms.filter(room => {
    // User must not be the creator
    if (!room.createdBy || String(room.createdBy._id) === String(user._id)) {
      return false;
    }

    // Check if user is currently a participant
    const isCurrentParticipant = Array.isArray(room.participants) && room.participants.some(participant => String(participant._id) === String(user._id));

    // If user is currently a participant, include the room
    if (isCurrentParticipant) {
      return true;
    }

    // Check if user has any activity in the room (messages, file edits, joins, etc.)
    // For now, we'll fall back to current participant check, but this could be enhanced
    // to check activity history in the future

    // For now, we'll keep the current logic but add a comment about potential future enhancement
    return isCurrentParticipant;
  }).filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.createdBy && room.createdBy.username && room.createdBy.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setIsCreating(true);
    console.log('Creating room:', newRoomName.trim());

    const result = await createRoom({
      name: newRoomName.trim(),
      createdBy: user._id
    });

    if (result.success) {
      console.log('Room created successfully:', result.data);
      setRooms(prev => {
        // Check if room already exists to prevent duplicates
        const exists = prev.some(room => room._id === result.data._id);
        if (exists) {
          console.log('Room already exists in state, not adding duplicate');
          return prev;
        }
        return [result.data, ...prev];
      });
      setNewRoomName("");
      setShowCreateModal(false);
    } else {
      console.error('Error creating room:', result.error);
      setError(result.error);
    }

    setIsCreating(false);
  };

  const handleJoinRoom = (room) => {
    console.log("Joining room:", room.name);
    // Navigate to room or implement join logic
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

    // First, try to get the room by ID to verify it exists
    const result = await getRoomById(roomCode.trim());

    if (!result.success) {
      setJoinError('Room not found. Please check the room ID.');
      setIsJoining(false);
      return;
    }

    const roomData = result.data;

    // Check if user is already a participant or creator
    if (roomData.createdBy === user._id || (Array.isArray(roomData.participants) && roomData.participants.some(p => String(p._id) === String(user._id)))) {
      setJoinError("You're already a member of this room.");
      setIsJoining(false);
      return;
    }

    // Join the room using socket and wait for confirmation
    if (socket) {
      try {
        // Create a promise that resolves when userJoinedRoom event is received
        const joinPromise = new Promise((resolve, reject) => {
          const handleUserJoinedRoom = (data) => {
            console.log('Received userJoinedRoom event:', data);
            const { roomId, room } = data;
            console.log('Room ID from event:', roomId, 'Expected room ID:', roomData._id);
            // If this room isn't in our current rooms list, add it
            if (roomId === roomData._id) {
              console.log('Room ID matches, adding room to list');
              setRooms(prev => {
                const roomExists = prev.some(r => String(r._id) === String(roomId));
                if (!roomExists) {
                  console.log('Room not in list, adding it');
                  return [room, ...prev];
                } else {
                  console.log('Room already in list');
                  return prev;
                }
              });
              socket.off('userJoinedRoom', handleUserJoinedRoom);
              resolve(room);
            } else {
              console.log('Room ID does not match');
            }
          };

          socket.on('userJoinedRoom', handleUserJoinedRoom);

          // Set a timeout in case the event doesn't come
          setTimeout(() => {
            socket.off('userJoinedRoom', handleUserJoinedRoom);
            reject(new Error('Join room timeout'));
          }, 5000);

          // Emit the join room event
          socket.emit("joinRoom", {
            roomId: roomData._id,
            user: {
              _id: user._id,
              username: user.username,
              email: user.email
            }
          });
        });

        // Wait for the room to be added to the user's rooms list
        await joinPromise;

        // Now navigate to the room
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
    console.log("Editing room:", room.name);
    // For now, use prompt as placeholder - should be replaced with modal
    const newName = prompt("Enter new room name:", room.name);
    if (newName && newName.trim() !== room.name) {
      handleUpdateRoom(room._id, { name: newName.trim() });
    }
  };

  const handleUpdateRoom = async (roomId, updateData) => {
    const result = await updateRoom(roomId, updateData);
    
    if (result.success) {
      setRooms(prev => prev.map(room => room._id === roomId ? result.data : room));
    } else {
      console.error('Error updating room:', result.error);
      setError(result.error);
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

  const handleCopyRoomLink = (room) => {
    // Copy only the room ID instead of the full URL
    navigator.clipboard.writeText(room._id);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
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

        <QuickStats rooms={rooms} filesCount={filesCount} />
        
        {/* Error Message */}
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
            <h2 className="text-2xl font-bold text-white">My Rooms</h2>
            {searchQuery && (
              <div className="text-sm text-gray-400">
                {myCreatedRooms.length} room{myCreatedRooms.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myCreatedRooms.map((room) => (
              <RoomCard 
                key={room._id} 
                room={{
                  ...room,
                  participants: Array.isArray(room.participants) ? room.participants.length : 0,
                  createdAt: new Date(room.createdAt).toLocaleDateString()
                }}
                onJoin={handleJoinRoom}
                onEdit={handleEditRoom}
                onDelete={handleDeleteRoom}
                onCopy={handleCopyRoomLink}
                user={user}
              />
            ))}
          </div>
          {myCreatedRooms.length === 0 && !isLoading && (
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
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">My Joined Rooms</h2>
            {searchQuery && (
              <div className="text-sm text-gray-400">
                {myJoinedRooms.length} room{myJoinedRooms.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myJoinedRooms.map((room) => (
              <RoomCard
                key={room._id}
                room={{
                  ...room,
                  participants: Array.isArray(room.participants) ? room.participants.length : 0,
                  createdAt: new Date(room.createdAt).toLocaleDateString(),
                  creator: room.createdBy ? room.createdBy.username : 'Unknown'
                }}
                onJoin={handleJoinRoom}
                onEdit={handleEditRoom}
                onDelete={handleDeleteRoom}
                onCopy={handleCopyRoomLink}
                user={user}
              />
            ))}
          </div>
          {myJoinedRooms.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-500 mb-4" size={48} />
              {searchQuery ? (
                <>
                  <p className="text-gray-500 text-lg">No joined rooms found for "{searchQuery}"</p>
                  <p className="text-gray-400 text-sm mt-2">Try a different search term</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 px-4 py-2 bg-[#A78BFA] text-[#1E1E1E] rounded-lg hover:bg-[#A78BFA]/90 transition-colors"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg">No joined rooms yet</p>
                  <p className="text-gray-400 text-sm mt-2">Join rooms using the "Join Room" button above</p>
                </>
              )}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-5">Recent Activity</h2>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity, i) => (
                <div key={activity._id || i} className="flex justify-between items-center p-4 rounded-lg bg-[#1E1E1E]/50 border border-gray-800">
                  <span className="text-white font-medium">{activity.description}</span>
                  <span className="text-gray-500 text-sm">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'Just now'}
                  </span>
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

        {/* Create Room Modal */}
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
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                    placeholder="Enter room name"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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

        {/* Delete Room Modal */}
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

        {/* Join Room Modal */}
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

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          Room ID copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default Dashboard;
