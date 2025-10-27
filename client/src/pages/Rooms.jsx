import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Calendar, MoreHorizontal, Edit, Trash2, Copy, ExternalLink, Loader2, X, Activity } from "lucide-react";
import Sidebar from "../components/Sidebar";
import RoomActivity from "../components/RoomActivity";
import useAuthContext from "../hooks/useAuthContext";
import { io } from "socket.io-client";
import { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom } from "../services/roomService";

// Constants
const DUPLICATE_TIME_WINDOW = 30000; // 30 seconds for activity deduplication

/**
 * Helper Functions
 * Utility functions for room filtering and validation
 */
const isValidRoomName = (name, rooms, excludeRoomId = null) => {
  if (!name || !name.trim()) return false;

  const trimmedName = name.trim().toLowerCase();
  return !rooms.some(room =>
    room._id !== excludeRoomId && room.name.toLowerCase() === trimmedName
  );
};

const filterRoomsBySearch = (rooms, searchQuery) => {
  if (!searchQuery) return rooms;

  const query = searchQuery.toLowerCase();
  return rooms.filter(room =>
    room.name.toLowerCase().includes(query) ||
    (room.createdBy && room.createdBy.username && room.createdBy.username.toLowerCase().includes(query))
  );
};

const formatRoomDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

const formatParticipantCount = (participants) => {
  return Array.isArray(participants) ? participants.length : 0;
};

/**
 * Room Card Component
 * Displays individual room information with management actions
 */
const RoomCard = ({ room, onEdit, onDelete, onJoin, onCopy, onShowActivity, user }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-md flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300 group relative room-card">
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-0 right-0 p-1 rounded-full hover:bg-gray-700 transition-colors z-10"
        >
          <MoreHorizontal size={16} className="text-gray-400 hover:text-white" />
        </button>

        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#A78BFA] transition-colors pr-8">{room.name}</h3>
        <p className="text-gray-400 text-sm">Collaborators: {room.participants}</p>
        {room.creator && <p className="text-gray-400 text-sm">Created by: {room.creator}</p>}
        <p className="text-gray-500 text-xs mt-1">Created: {room.createdAt}</p>

        {showMenu && (
          <div ref={menuRef} className="absolute top-8 right-0 bg-[#1E1E1E] border border-gray-700 rounded-lg shadow-lg z-20 min-w-[120px]">
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
            <button
              onClick={() => {
                onShowActivity(room);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-gray-700 hover:text-blue-300 hover:rounded-lg transition-colors flex items-center gap-2"
            >
              <Activity size={14} />
              View Activity
            </button>
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

/**
 * Main Rooms Component
 * Displays and manages user's created and joined rooms
 */
const Rooms = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Core state management
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(null);

  const [selectedRoomForActivity, setSelectedRoomForActivity] = useState(null);

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:4000');

    socket.on('roomDeleted', ({ roomId, roomName }) => {
      setRooms(prev => prev.filter(room => String(room._id) !== String(roomId)));
    });

    socket.on('userJoinedRoom', ({ roomId, room }) => {
      if (room) {
        setRooms(prev => {
          const exists = prev.some(r => String(r._id) === String(room._id));
          if (exists) {
            return prev.map(r => String(r._id) === String(room._id) ? room : r);
          } else {
            return [room, ...prev];
          }
        });
      }
    });

    socket.on('roomParticipantsUpdated', ({ roomId, participants }) => {
      setRooms(prev => prev.map(r => String(r._id) === String(roomId) ? { ...r, participants } : r));
    });

    socket.on('roomCreated', (newRoom) => {
      if (String(newRoom.createdBy) !== String(user._id) &&
          (Array.isArray(newRoom.participants) && newRoom.participants.some(p => String(p._id) === String(user._id)))) {
        setRooms(prev => {
          const exists = prev.some(r => String(r._id) === String(newRoom._id));
          if (exists) {
            return prev;
          }
          return [newRoom, ...prev];
        });
      }
    });

    return () => {
      socket.off('roomDeleted');
      socket.off('userJoinedRoom');
      socket.off('roomParticipantsUpdated');
      socket.off('roomCreated');
      socket.disconnect();
    };
  }, [user]);

  const fetchRooms = async () => {
    setIsLoading(true);

    try {
      const result = await getAllRooms();

      if (result.success) {
        setRooms(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to load rooms');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Room filtering logic
  const filteredRooms = filterRoomsBySearch(rooms, searchQuery);

  const myCreatedRooms = filteredRooms.filter(room =>
    room.createdBy && String(room.createdBy._id) === String(user._id)
  );

  const myJoinedRooms = filteredRooms.filter(room => {
    const isCreator = room.createdBy && String(room.createdBy._id) === String(user._id);
    const isParticipant = Array.isArray(room.participants) && room.participants.some(participant => String(participant._id) === String(user._id));

    return room.createdBy && !isCreator && isParticipant;
  });

  const [createError, setCreateError] = useState("");

  // Event Handlers
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    if (!isValidRoomName(newRoomName, rooms)) {
      setCreateError("A room with this name already exists. Please choose a different name.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
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
        if (result.error.includes("already exists")) {
          setCreateError(result.error);
        } else {
          setCreateError("Failed to create room. Please try again.");
        }
      }
    } catch (error) {
      setCreateError("Failed to create room. Please try again.");
    }

    setIsCreating(false);
  };

  const handleJoinRoom = (room) => {
    navigate(`/room/${room._id}`);
  };

  const handleEditRoom = (room) => {
    setRoomToEdit(room);
    setEditRoomName(room.name);
    setShowEditModal(true);
    setError("");
  };

  const confirmEditRoom = async () => {
    if (!roomToEdit || !editRoomName.trim() || editRoomName.trim() === roomToEdit.name) {
      setShowEditModal(false);
      setRoomToEdit(null);
      setEditRoomName("");
      return;
    }

    if (!isValidRoomName(editRoomName, rooms, roomToEdit._id)) {
      setError("A room with this name already exists. Please choose a different name.");
      return;
    }

    setIsEditing(true);
    setError("");

    try {
      const result = await updateRoom(roomToEdit._id, { name: editRoomName.trim() });

      if (result.success) {
        setRooms(prev => prev.map(room => room._id === roomToEdit._id ? result.data : room));
        setShowEditModal(false);
        setRoomToEdit(null);
        setEditRoomName("");
        setError("");
      } else {
        if (result.error.includes("already exists")) {
          setError(result.error);
        } else {
          setError("Failed to update room. Please try again.");
        }
      }
    } catch (error) {
      setError("Failed to update room. Please try again.");
    }

    setIsEditing(false);
  };

  const handleDeleteRoom = (room) => {
    setRoomToDelete(room);
    setShowDeleteModal(true);
    setError("");
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;

    setIsDeleting(true);

    try {
      const result = await deleteRoom(roomToDelete._id);

      if (result.success) {
        setRooms(prev => prev.filter(r => r._id !== roomToDelete._id));
        setShowDeleteModal(false);
        setRoomToDelete(null);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("Failed to delete room. Please try again.");
    }

    setIsDeleting(false);
  };

  const handleCopyRoomLink = (room) => {
    navigator.clipboard.writeText(room._id);
    setCopiedRoom(room);
    setShowCopyModal(true);
  };

  const handleShowRoomActivity = (room) => {
    setSelectedRoomForActivity(room);
  };

  const handleHideRoomActivity = () => {
    setSelectedRoomForActivity(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading rooms...</span>
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
            <h1 className="text-3xl font-bold text-white">Rooms</h1>
            <p className="text-gray-400 mt-1">Manage your collaborative workspaces and join new ones.</p>
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-[#A78BFA] px-6 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Room
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Rooms</p>
                <p className="text-white text-3xl font-bold mt-1">{rooms.length}</p>
              </div>
              <div className="p-3 rounded-full bg-[#A78BFA]/10 text-[#A78BFA]">
                <Users size={22} />
              </div>
            </div>
          </div>

          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Collaborators</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {rooms.reduce((sum, room) => {
                    return sum + formatParticipantCount(room.participants);
                  }, 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                <Users size={22} />
              </div>
            </div>
          </div>

          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">This Week</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {rooms.filter(room => {
                    const roomDate = new Date(room.createdAt);
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    return roomDate >= oneWeekAgo;
                  }).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                <Calendar size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
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

        {/* My Created Rooms Section */}
        <section>
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
                  participants: formatParticipantCount(room.participants),
                  createdAt: formatRoomDate(room.createdAt)
                }}
                onJoin={handleJoinRoom}
                onEdit={handleEditRoom}
                onDelete={handleDeleteRoom}
                onCopy={handleCopyRoomLink}
                onShowActivity={handleShowRoomActivity}
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

        {/* My Joined Rooms Section */}
        <section className="mt-8">
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
                  participants: formatParticipantCount(room.participants),
                  createdAt: formatRoomDate(room.createdAt),
                  creator: room.createdBy ? room.createdBy.username : 'Unknown'
                }}
                onJoin={handleJoinRoom}
                onEdit={handleEditRoom}
                onDelete={handleDeleteRoom}
                onCopy={handleCopyRoomLink}
                onShowActivity={handleShowRoomActivity}
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
                  <p className="text-gray-400 text-sm mt-2">Join rooms using room links shared with you</p>
                </>
              )}
            </div>
          )}
        </section>

        {/* Room Activity Section */}
        {selectedRoomForActivity && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
                <span className="text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                  {selectedRoomForActivity.name}
                </span>
              </div>
              <button
                onClick={handleHideRoomActivity}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Close
              </button>
            </div>
            <RoomActivity
              roomId={selectedRoomForActivity._id}
              showAllActivities={false}
              maxItems={20}
            />
          </section>
        )}


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

        {/* Edit Room Modal */}
        {showEditModal && roomToEdit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Edit Room Name</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={editRoomName}
                  onChange={(e) => {
                    setEditRoomName(e.target.value);
                    setError("");
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                  placeholder="Enter room name"
                  autoFocus
                />
                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setRoomToEdit(null);
                    setEditRoomName("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                  disabled={isEditing}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEditRoom}
                  disabled={isEditing || !editRoomName.trim()}
                  className="flex-1 px-4 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isEditing && <Loader2 className="animate-spin" size={16} />}
                  {isEditing ? 'Updating...' : 'Update Room'}
                </button>
              </div>
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

        {/* Copy Confirmation Modal */}
        {showCopyModal && copiedRoom && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-4">Room ID Copied!</h3>
              <p className="text-gray-300 mb-2">
                Room ID for <span className="text-white font-semibold">"{copiedRoom.name}"</span> has been copied to your clipboard.
              </p>
              <p className="text-gray-400 text-sm mb-6">
                You can now share this room ID with others to invite them to the room.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopiedRoom(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Rooms;