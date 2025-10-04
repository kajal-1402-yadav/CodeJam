import { useState, useEffect, useRef } from "react";
import { Plus, Search, Users, Calendar, MoreVertical, Edit, Trash2, Copy, ExternalLink, Loader2, X, Link as LinkIcon, Check, Activity as ActivityIcon } from "lucide-react";
import Sidebar from "../components/Sidebar";
import RoomActivity from "../components/RoomActivity";
import useAuthContext from "../hooks/useAuthContext";
import { useNavigate } from "react-router-dom";

const RoomCard = ({ room, onEdit, onDelete, onJoin, onCopy }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-6 shadow-md hover:border-[#A78BFA]/50 transition-all duration-300 group relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg mb-2 group-hover:text-[#A78BFA] transition-colors">
            {room.name}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span>{Array.isArray(room.participants) ? room.participants.length : (room.participants || 0)} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{room.createdAt}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={16} className="text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-10 w-32 bg-[#2D2D2D] rounded-md shadow-lg z-10 border border-gray-700">
              <button
                onClick={() => {
                  onEdit(room);
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                <Edit size={14} className="mr-2" /> Rename
              </button>
              <button
                onClick={() => {
                  onDelete(room);
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onJoin(room)}
          className="flex-1 rounded-lg bg-[#A78BFA] px-4 py-2 text-sm font-bold text-[#1E1E1E] hover:bg-[#A78BFA]/90 transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink size={16} />
          Join Room
        </button>
        <button
          onClick={() => onCopy(room)}
          className="px-4 py-2 rounded-lg border border-gray-600 text-sm font-bold text-gray-300 hover:border-[#A78BFA] hover:text-white transition-colors flex items-center gap-2"
        >
          <Copy size={16} />
          Copy
        </button>
      </div>
    </div>
  );
};

const Rooms = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // Join room state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Delete room state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename room state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [roomToRename, setRoomToRename] = useState(null);
  const [renameInput, setRenameInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Toast state for copy notifications
  const [showToast, setShowToast] = useState(false);

  // Fetch rooms from backend
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/rooms`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.createdBy && room.createdBy.username && room.createdBy.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setIsCreating(true);
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: newRoomName.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }

      const newRoom = await response.json();
      setRooms(prev => [newRoom, ...prev]);
      setNewRoomName("");
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating room:', error);
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (room) => {
    if (room?._id) {
      navigate(`/room/${room._id}`);
    } else {
      console.error('Invalid room data:', room);
      setError('Failed to join room: Invalid room data');
    }
  };

  const handleEditRoom = (room) => {
    setRoomToRename(room);
    setRenameInput(room.name);
    setShowRenameModal(true);
  };

  const confirmRenameRoom = async () => {
    if (!roomToRename || !renameInput.trim() || renameInput.trim() === roomToRename.name) {
      setShowRenameModal(false);
      setRoomToRename(null);
      setRenameInput("");
      return;
    }

    try {
      setIsRenaming(true);
      await updateRoom(roomToRename._id, { name: renameInput.trim() });
      setShowRenameModal(false);
      setRoomToRename(null);
      setRenameInput("");
    } catch (error) {
      console.error('Error renaming room:', error);
      setError(error.message);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleJoinRoomById = async (e) => {
    e.preventDefault();
    if (!joinRoomInput.trim()) return;

    setIsJoining(true);
    try {
      // Extract room ID from link or use input directly
      let roomId = joinRoomInput.trim();

      // Handle different input formats
      if (roomId.includes('/room/')) {
        // Extract ID from URL format: /room/{id}
        const match = roomId.match(/\/room\/([a-f\d]{24})/i);
        if (match) {
          roomId = match[1];
        } else {
          throw new Error('Invalid room link format');
        }
      }

      // Validate MongoDB ObjectId format (24 hex characters)
      if (!/^[a-f\d]{24}$/i.test(roomId)) {
        throw new Error('Invalid room ID format');
      }

      // Navigate to the room
      navigate(`/room/${roomId}`);
      setShowJoinModal(false);
      setJoinRoomInput("");
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const updateRoom = async (roomId, updateData) => {
    try {
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update room');
      }

      const updatedRoom = await response.json();
      setRooms(prev => prev.map(room => room._id === roomId ? updatedRoom : room));
    } catch (error) {
      console.error('Error updating room:', error);
      setError(error.message);
    }
  };

  const handleDeleteRoom = (room) => {
    setRoomToDelete(room);
    setShowDeleteModal(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/rooms/${roomToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete room');
      }

      setRooms(prev => prev.filter(r => r._id !== roomToDelete._id));
      setShowDeleteModal(false);
      setRoomToDelete(null);
    } catch (error) {
      console.error('Error deleting room:', error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyRoomLink = async (room) => {
    const roomId = room._id;

    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = roomId;
    document.body.appendChild(tempInput);

    // Select and copy the text
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices

    try {
      // Try using the modern clipboard API first
      await navigator.clipboard.writeText(roomId);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      // Fallback for when clipboard API fails
      document.execCommand('copy');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      // Clean up
      document.body.removeChild(tempInput);
    }
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
              onClick={() => setShowJoinModal(true)}
              className="rounded-xl bg-gray-600 px-6 py-3 text-base font-bold text-white hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
            >
              <LinkIcon size={16} /> Join Room
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-[#A78BFA] px-6 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Room
            </button>
          </div>
        </div>

        {/* Stats Cards */}
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
                <p className="text-gray-400 text-sm font-medium">Active Participants</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {rooms.reduce((sum, room) => sum + (Array.isArray(room.participants) ? room.participants.length : (room.participants || 0)), 0)}
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
                <p className="text-white text-3xl font-bold mt-1">3</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                <Calendar size={22} />
              </div>
            </div>
          </div>
        </div>

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

        {/* Rooms Grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">My Rooms</h2>
            {searchQuery && (
              <div className="text-sm text-gray-400">
                {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room._id}
                room={{
                  ...room,
                  participants: Array.isArray(room.participants) ? room.participants.length : (room.participants || 0),
                  createdAt: new Date(room.createdAt).toLocaleDateString()
                }}
                onJoin={handleJoinRoom}
                onEdit={handleEditRoom}
                onDelete={handleDeleteRoom}
                onCopy={() => handleCopyRoomLink(room)}
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

        {/* Room History Section */}
        <section className="mt-8 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">Room History</h2>
          </div>
          <RoomActivity showAllActivities={true} maxItems={10} />
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
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                    placeholder="Enter room name"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewRoomName("");
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
              <p className="text-gray-300 mb-2">
                Enter a room ID or paste a room link to join an existing room.
              </p>

              <form onSubmit={handleJoinRoomById}>
                <div className="mb-6">
                  <input
                    type="text"
                    value={joinRoomInput}
                    onChange={(e) => setJoinRoomInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                    placeholder="Enter room ID or paste room link..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowJoinModal(false);
                        setJoinRoomInput("");
                      }
                    }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinRoomInput("");
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                    disabled={isJoining}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isJoining || !joinRoomInput.trim()}
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
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <Check size={16} />
          Room link copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default Rooms;
