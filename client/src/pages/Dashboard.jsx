import { useState } from "react";
import { Users, FilePlus, Bell, Plus, Search } from "lucide-react";
import Sidebar from "../components/Sidebar";

const QuickStats = () => {
  const stats = [];
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

const RoomCard = ({ room }) => {
  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-md flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300">
      <div>
        <h3 className="text-white font-bold text-lg mb-1">{room.name}</h3>
        <p className="text-gray-400 text-sm">Participants: {room.participants}</p>
      </div>
      <div className="mt-5 flex gap-3">
        <button className="flex-1 rounded-lg bg-[#A78BFA] px-4 py-2 text-sm font-bold text-[#1E1E1E] hover:bg-[#A78BFA]/90 transition-colors">
          Open
        </button>
        <button className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-sm font-bold text-gray-300 hover:border-[#A78BFA] hover:text-white transition-colors">
          Copy Link
        </button>
      </div>
    </div>
  );
};


const Dashboard = () => {
  const [rooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
              />
            </div>
            <div className="flex gap-4">
              <button className="rounded-xl bg-[#A78BFA] px-6 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors inline-flex items-center gap-2">
                <Plus size={16} /> Create Room
              </button>
              <button className="rounded-xl bg-[#A78BFA]/20 px-6 py-3 text-base font-bold text-white border border-purple-500/30 ring-1 ring-inset ring-[#A78BFA]/30 hover:bg-[#A78BFA]/30 transition-colors">
                Join Room
              </button>
            </div>
          </div>
        </div>

        <QuickStats />
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-white mb-5">My Rooms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRooms.map((room, i) => (
              <RoomCard key={i} room={room} />
            ))}
          </div>
          {filteredRooms.length === 0 && (
            <p className="text-gray-500 text-center mt-6">No rooms found. Try a different search.</p>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-5">Templates</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {[].map((temp, i) => (
              <div
                key={i}
                className="min-w-[220px] p-5 rounded-xl bg-[#1E1E1E]/50 border border-gray-800 hover:border-[#A78BFA]/50 transition-colors cursor-pointer"
              >
                <h3 className="text-white font-bold text-md">{temp} Starter</h3>
                <p className="text-gray-400 mt-1 text-sm">Quickly start a new project</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-5">Recent Activity</h2>
          <div className="space-y-3">
            {[].map((activity, i) => (
              <div key={i} className="flex justify-between items-center p-4 rounded-lg bg-[#1E1E1E]/50 border border-gray-800">
                <span className="text-white font-medium">{activity.action}</span>
                <span className="text-gray-500 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
