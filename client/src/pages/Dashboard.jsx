import { useState, useEffect } from "react";
import { Users, FilePlus, Bell, Plus, Search, Loader2, X, ExternalLink, Copy, Edit, Trash2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import useAuthContext from "../hooks/useAuthContext";
import { useNavigate } from "react-router-dom";

const QuickStats = ({ rooms = [] }) => {
  const totalParticipants = rooms.reduce((sum, room) => sum + (room.participants?.length || 0), 0);
  
  const stats = [
    {
      label: "Active Rooms",
      value: rooms.length,
      icon: Users
    },
    {
      label: "Team Members",
      value: totalParticipants,
      icon: Users
    },
    {
      label: "Files Shared",
      value: 28, // This would need to be fetched from files API
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

const RoomCard = ({ room, onJoin, onEdit, onDelete, onCopy }) => {
  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-md flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300 group">
      <div>
        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#A78BFA] transition-colors">{room.name}</h3>
        <p className="text-gray-400 text-sm">Participants: {room.participants}</p>
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

  // Toast state for copy notifications
  const [showToast, setShowToast] = useState(false);

  // Delete room state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          name: newRoomName.trim(),
          createdBy: user._id
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
    console.log("Joining room:", room.name);
    // Navigate to room or implement join logic
    navigate(`/room/${room._id}`);
  };

  const handleEditRoom = (room) => {
    console.log("Editing room:", room.name);
    // For now, use prompt as placeholder - should be replaced with modal
    const newName = prompt("Enter new room name:", room.name);
    if (newName && newName.trim() !== room.name) {
      updateRoom(room._id, { name: newName.trim() });
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

  const handleCopyRoomLink = (room) => {
    const roomLink = `${window.location.origin}/room/${room._id}`;
    navigator.clipboard.writeText(roomLink);
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
              <button className="rounded-xl bg-[#A78BFA]/20 px-6 py-3 text-base font-bold text-white border border-purple-500/30 ring-1 ring-inset ring-[#A78BFA]/30 hover:bg-[#A78BFA]/30 transition-colors">
                Join Room
              </button>
            </div>
          </div>
        </div>

        <QuickStats rooms={rooms} />
        
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
                  participants: room.participants?.length || 0,
                  createdAt: new Date(room.createdAt).toLocaleDateString()
                }}
                onJoin={handleJoinRoom}
                onEdit={handleEditRoom}
                onDelete={handleDeleteRoom}
                onCopy={handleCopyRoomLink}
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
          <h2 className="text-2xl font-bold text-white mb-5">Popular Templates</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {[
              { name: "React", description: "Modern React app with Vite" },
              { name: "Node.js", description: "Express API with MongoDB" },
              { name: "Vue.js", description: "Vue 3 SPA with Composition API" },
              { name: "Next.js", description: "Full-stack React framework" }
            ].map((temp, i) => (
              <div
                key={i}
                className="min-w-[220px] p-5 rounded-xl bg-[#1E1E1E]/50 border border-gray-800 hover:border-[#A78BFA]/50 transition-colors cursor-pointer"
              >
                <h3 className="text-white font-bold text-md">{temp.name} Starter</h3>
                <p className="text-gray-400 mt-1 text-sm">{temp.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-5">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: "Created room 'React Development Team'", time: "2 hours ago" },
              { action: "Uploaded 'component-library.zip'", time: "4 hours ago" },
              { action: "Joined 'Backend API Discussion'", time: "1 day ago" },
              { action: "Shared file with team", time: "2 days ago" }
            ].map((activity, i) => (
              <div key={i} className="flex justify-between items-center p-4 rounded-lg bg-[#1E1E1E]/50 border border-gray-800">
                <span className="text-white font-medium">{activity.action}</span>
                <span className="text-gray-500 text-sm">{activity.time}</span>
              </div>
            ))}
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
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          Room link copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default Dashboard;
