import { useState } from "react";
import { Users, Search, Plus, Mail, UserPlus, Crown, Shield, Star } from "lucide-react";
import Sidebar from "../components/Sidebar";

const ContributorCard = ({ contributor, onInvite, onViewProfile }) => {
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Crown className="text-yellow-400" size={16} />;
      case 'moderator': return <Shield className="text-blue-400" size={16} />;
      case 'member': return <Star className="text-green-400" size={16} />;
      default: return <Users className="text-gray-400" size={16} />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-yellow-400';
      case 'moderator': return 'text-blue-400';
      case 'member': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-6 shadow-md hover:border-[#A78BFA]/50 transition-all duration-300 group">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#A78BFA] flex items-center justify-center text-white font-bold text-lg">
          {contributor.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold text-lg group-hover:text-[#A78BFA] transition-colors">
              {contributor.username}
            </h3>
            {getRoleIcon(contributor.role)}
          </div>
          <p className="text-gray-400 text-sm">{contributor.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${getRoleColor(contributor.role)}`}>
              {contributor.role.charAt(0).toUpperCase() + contributor.role.slice(1)}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 text-xs">{contributor.joinedAt}</span>
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
  const [contributors] = useState([
    {
      id: 1,
      username: "alex_dev",
      email: "alex@example.com",
      role: "admin",
      joinedAt: "2 months ago",
      status: "online",
      contributions: 45
    },
    {
      id: 2,
      username: "sarah_ui",
      email: "sarah@example.com",
      role: "moderator",
      joinedAt: "1 month ago",
      status: "online",
      contributions: 32
    },
    {
      id: 3,
      username: "mike_backend",
      email: "mike@example.com",
      role: "member",
      joinedAt: "3 weeks ago",
      status: "offline",
      contributions: 18
    },
    {
      id: 4,
      username: "jessica_design",
      email: "jessica@example.com",
      role: "member",
      joinedAt: "2 weeks ago",
      status: "online",
      contributions: 12
    },
    {
      id: 5,
      username: "david_qa",
      email: "david@example.com",
      role: "member",
      joinedAt: "1 week ago",
      status: "offline",
      contributions: 8
    },
    {
      id: 6,
      username: "emma_frontend",
      email: "emma@example.com",
      role: "member",
      joinedAt: "5 days ago",
      status: "online",
      contributions: 5
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  const filteredContributors = contributors.filter(contributor =>
    contributor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contributor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = contributors.filter(c => c.status === 'online').length;
  const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Contributors</p>
                <p className="text-white text-3xl font-bold mt-1">{contributors.length}</p>
              </div>
              <div className="p-3 rounded-full bg-[#A78BFA]/10 text-[#A78BFA]">
                <Users size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Online Now</p>
                <p className="text-white text-3xl font-bold mt-1">{onlineCount}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                <Users size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Contributions</p>
                <p className="text-white text-3xl font-bold mt-1">{totalContributions}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                <Star size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Contributors Grid */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-5">Team Members</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContributors.map((contributor) => (
              <ContributorCard 
                key={contributor.id} 
                contributor={contributor} 
                onInvite={handleInviteContributor}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>
          {filteredContributors.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No contributors found</p>
              <p className="text-gray-400 text-sm mt-2">Try a different search or invite new team members</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Contributors;
