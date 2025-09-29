import { useState } from "react";
import { Bell, Search, Check, X, MoreVertical, Users, FileText, MessageSquare, Settings } from "lucide-react";
import Sidebar from "../components/Sidebar";

const NotificationItem = ({ notification, onMarkRead, onDelete }) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'room': return <Users className="text-blue-400" size={20} />;
      case 'file': return <FileText className="text-green-400" size={20} />;
      case 'message': return <MessageSquare className="text-purple-400" size={20} />;
      case 'system': return <Settings className="text-gray-400" size={20} />;
      default: return <Bell className="text-[#A78BFA]" size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'room': return 'border-l-blue-400';
      case 'file': return 'border-l-green-400';
      case 'message': return 'border-l-purple-400';
      case 'system': return 'border-l-gray-400';
      default: return 'border-l-[#A78BFA]';
    }
  };

  return (
    <div className={`bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-4 shadow-md hover:border-[#A78BFA]/50 transition-all duration-300 group border-l-4 ${getNotificationColor(notification.type)} ${!notification.isRead ? 'bg-[#A78BFA]/5' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`font-semibold text-sm ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
                {notification.title}
              </h3>
              <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">{notification.timestamp}</span>
                {!notification.isRead && (
                  <span className="w-2 h-2 bg-[#A78BFA] rounded-full"></span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.isRead && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  className="p-1 rounded hover:bg-gray-700 transition-colors"
                  title="Mark as read"
                >
                  <Check size={16} className="text-green-400" />
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 rounded hover:bg-gray-700 transition-colors"
                title="Delete notification"
              >
                <X size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'room',
      title: 'New Room Invitation',
      message: 'You have been invited to join "React Development Team" by alex_dev',
      timestamp: '2 minutes ago',
      isRead: false
    },
    {
      id: 2,
      type: 'file',
      title: 'File Uploaded',
      message: 'sarah_ui uploaded "component-library.zip" to React Development Team',
      timestamp: '15 minutes ago',
      isRead: false
    },
    {
      id: 3,
      type: 'message',
      title: 'New Message',
      message: 'mike_backend sent a message in "Backend API Discussion"',
      timestamp: '1 hour ago',
      isRead: true
    },
    {
      id: 4,
      type: 'system',
      title: 'System Update',
      message: 'CodeJam has been updated to version 2.1.0 with new features',
      timestamp: '3 hours ago',
      isRead: true
    },
    {
      id: 5,
      type: 'room',
      title: 'Room Created',
      message: 'You successfully created "UI/UX Design Review" room',
      timestamp: '1 day ago',
      isRead: true
    },
    {
      id: 6,
      type: 'file',
      title: 'File Shared',
      message: 'jessica_design shared "design-mockups.fig" with you',
      timestamp: '2 days ago',
      isRead: true
    },
    {
      id: 7,
      type: 'message',
      title: 'Mentioned in Message',
      message: 'david_qa mentioned you in a message in "Database Optimization"',
      timestamp: '3 days ago',
      isRead: true
    },
    {
      id: 8,
      type: 'system',
      title: 'Welcome to CodeJam',
      message: 'Welcome to CodeJam! Start by creating your first room or joining an existing one.',
      timestamp: '1 week ago',
      isRead: true
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");

  const notificationTypes = [
    { value: "All", label: "All Notifications" },
    { value: "room", label: "Rooms" },
    { value: "file", label: "Files" },
    { value: "message", label: "Messages" },
    { value: "system", label: "System" }
  ];

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "All" || notification.type === filterType;
    return matchesSearch && matchesType;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
      <Sidebar />

      <main className="flex-1 p-8 ml-64">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-gray-400 mt-1">Stay updated with your team's activities.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-initial">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="rounded-xl bg-green-600/20 px-4 py-3 text-sm font-bold text-green-400 border border-green-500/30 hover:bg-green-600/30 transition-colors"
                >
                  Mark All Read
                </button>
              )}
              <button 
                onClick={handleClearAll}
                className="rounded-xl bg-red-600/20 px-4 py-3 text-sm font-bold text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Notifications</p>
                <p className="text-white text-3xl font-bold mt-1">{notifications.length}</p>
              </div>
              <div className="p-3 rounded-full bg-[#A78BFA]/10 text-[#A78BFA]">
                <Bell size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Unread</p>
                <p className="text-white text-3xl font-bold mt-1">{unreadCount}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
                <Bell size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">This Week</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {notifications.filter(n => {
                    const notificationDate = new Date(n.timestamp);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return notificationDate > weekAgo;
                  }).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                <Bell size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {notificationTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilterType(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === type.value
                  ? 'bg-[#A78BFA] text-[#1E1E1E]'
                  : 'bg-[#1E1E1E]/50 border border-gray-700 text-gray-300 hover:border-[#A78BFA]/50 hover:text-white'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-5">
            {filterType === "All" ? "All Notifications" : `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Notifications`}
          </h2>
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No notifications found</p>
              <p className="text-gray-400 text-sm mt-2">Try a different search or filter</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Notifications;
