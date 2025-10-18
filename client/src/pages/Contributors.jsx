import { useState, useEffect } from "react";
import { Users, Search, Plus, Mail, UserPlus, Crown, Shield, Star } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { getAllRooms } from "../services/roomService";
import useAuthContext from "../hooks/useAuthContext";

const ContributorCard = ({ contributor, onInvite, onViewProfile, isCurrentUser, isRoomCreator }) => {
  const getRoleIcon = () => {
    if (isRoomCreator) {
      return <Crown className="text-yellow-400" size={16} />;
    }
    return <Users className="text-gray-400" size={16} />;
  };

  const getRoleColor = () => {
    if (isRoomCreator) {
      return 'text-yellow-400';
    }
    return 'text-gray-400';
  };

  const formatJoinTime = (timestamp) => {
    if (!timestamp) return "Unknown";

    try {
      const date = new Date(timestamp);
      return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return "Unknown";
    }
  };

  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-6 shadow-md hover:border-[#A78BFA]/50 transition-all duration-300 group">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#A78BFA] flex items-center justify-center text-white font-bold text-lg">
          {contributor.username?.charAt(0).toUpperCase() || contributor.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold text-lg group-hover:text-[#A78BFA] transition-colors">
              {contributor.username || contributor.email || 'Unknown User'}
              {isCurrentUser && <span className="text-xs text-yellow-400 ml-1">(You)</span>}
            </h3>
            {getRoleIcon()}
          </div>
          {contributor.email && (
            <p className="text-gray-400 text-sm">{contributor.email}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${getRoleColor()}`}>
              {isRoomCreator ? 'Admin' : 'Contributors'}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 text-xs">{formatJoinTime(contributor.joinedAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onViewProfile(contributor)}
          className="flex-1 rounded-lg bg-[#A78BFA] px-4 py-2 text-sm font-bold text-[#1E1E1E] hover:bg-[#A78BFA]/90 transition-colors flex items-center justify-center gap-2"
        >
          <Users size={16} />
          View Profile
        </button>
        <button
          onClick={() => onInvite(contributor)}
          className="px-4 py-2 rounded-lg border border-gray-600 text-sm font-bold text-gray-300 hover:border-[#A78BFA] hover:text-white transition-colors flex items-center gap-2"
        >
          <Mail size={16} />
          Message
        </button>
      </div>
    </div>
  );
};

const Contributors = () => {
  const { user } = useAuthContext();
  const [contributors, setContributors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Track initial page load
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch all rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      const result = await getAllRooms();
      if (result.success) {
        setRooms(result.data);
      }
      setIsInitialLoading(false); // Set initial loading to false after rooms are fetched
    };
    fetchRooms();
  }, []);

  // Fetch participants when room changes
  useEffect(() => {
    if (!selectedRoom) {
      setContributors([]);
      return;
    }

    const fetchRoomData = async () => {
      setIsLoading(true);

      // Get room details (includes participants)
      const roomResult = await getAllRooms();
      if (roomResult.success) {
        const room = roomResult.data.find(r => r._id === selectedRoom);
        if (room) {
          // Format participants with join time
          const formattedParticipants = (room.participants || []).map(participant => ({
            ...participant,
            joinedAt: room.createdAt, // For now, use room creation time as join time
            isCurrentUser: participant._id === user?._id,
            isRoomCreator: participant._id === room.createdBy?._id
          }));

          setContributors(formattedParticipants);
        }
      }

      setIsLoading(false);
    };

    fetchRoomData();
  }, [selectedRoom, user]);

  const filteredContributors = contributors.filter(contributor =>
    contributor.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contributor.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteContributor = (contributor) => {
    console.log("Inviting contributor:", contributor.username);
    // Implement invite logic
  };

  const handleViewProfile = (contributor) => {
    console.log("Viewing profile:", contributor.username);
    // Implement view profile logic
  };

  return (
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
      <Sidebar />

      <main className="flex-1 p-8 ml-64">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Contributors</h1>
            <p className="text-gray-400 mt-1">Manage your team members and collaborators.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-initial">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search contributors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
              />
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="rounded-xl bg-[#A78BFA] px-6 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors inline-flex items-center gap-2"
            >
              <UserPlus size={16} /> Invite Contributor
            </button>
          </div>
        </div>

        {/* Room Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Filter by Room
          </label>
          <select
            value={selectedRoom || ''}
            onChange={(e) => setSelectedRoom(e.target.value || null)}
            className="w-full max-w-md px-3 py-2 bg-[#2D2D2D] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA]"
          >
            <option value="">All Rooms</option>
            {rooms.map(room => (
              <option key={room._id} value={room._id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        {/* Contributors Grid */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-5">
            {selectedRoom ? 'Room Participants' : 'All Contributors'}
          </h2>

          {isInitialLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A78BFA] mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading contributors...</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A78BFA] mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading contributors...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredContributors.map((contributor) => (
                <ContributorCard
                  key={contributor._id}
                  contributor={contributor}
                  isCurrentUser={contributor.isCurrentUser}
                  isRoomCreator={contributor.isRoomCreator}
                  onInvite={handleInviteContributor}
                  onViewProfile={handleViewProfile}
                />
              ))}
            </div>
          )}
          {!isLoading && !isInitialLoading && filteredContributors.length === 0 && selectedRoom && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No participants found for this room</p>
              <p className="text-gray-400 text-sm mt-2">Invite team members to collaborate</p>
            </div>
          )}

          {!isLoading && !isInitialLoading && filteredContributors.length === 0 && !selectedRoom && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No contributors found</p>
              <p className="text-gray-400 text-sm mt-2">Select a room to view participants</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Contributors;
