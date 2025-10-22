import { useState, useEffect } from "react";
import { Bell, Search, Check, X, Users, FileText, MessageSquare, Settings, UserPlus, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  transformActivityToNotification,
  acceptInvitationFromNotification,
  declineInvitationFromNotification
} from "../services/notificationService";

const NotificationItem = ({ notification, onMarkRead, onDelete, onAcceptInvitation, onDeclineInvitation }) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'room': return <Users className="text-blue-400" size={20} />;
      case 'file': return <FileText className="text-green-400" size={20} />;
      case 'message': return <MessageSquare className="text-purple-400" size={20} />;
      case 'system': return <Settings className="text-gray-400" size={20} />;
      case 'invitation': return <UserPlus className="text-orange-400" size={20} />;
      default: return <Bell className="text-[#A78BFA]" size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'room': return 'border-l-blue-400';
      case 'file': return 'border-l-green-400';
      case 'message': return 'border-l-purple-400';
      case 'system': return 'border-l-gray-400';
      case 'invitation': return 'border-l-orange-400';
      default: return 'border-l-[#A78BFA]';
    }
  };

  return (
    <div className={`bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-4 shadow-md hover:border-[#A78BFA]/50 transition-all duration-300 group border-l-4 transform hover:-translate-y-1 ${getNotificationColor(notification.type)} ${!notification.isRead ? 'bg-[#A78BFA]/5 border-[#A78BFA]/30' : ''}`}>
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
              {notification.type === 'invitation' && notification.activityData?.type === 'invitation_sent' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onAcceptInvitation(notification.activityData?._id)}
                    className="p-1 rounded hover:bg-green-600 transition-colors"
                    title="Accept invitation"
                  >
                    <CheckCircle size={16} className="text-green-400" />
                  </button>
                  <button
                    onClick={() => onDeclineInvitation(notification.activityData?._id)}
                    className="p-1 rounded hover:bg-red-600 transition-colors"
                    title="Decline invitation"
                  >
                    <XCircle size={16} className="text-red-400" />
                  </button>
                </div>
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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const notificationTypes = [
    { value: "All", label: "All Notifications" },
    { value: "room", label: "Rooms" },
    { value: "file", label: "Files" },
    { value: "message", label: "Messages" },
    { value: "invitation", label: "Invites" },
    { value: "system", label: "System" }
  ];

  // Load notifications from backend
  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getNotifications(100, 1); // Get more notifications for better UX

        if (response.success) {
          // Transform activities to notification format
          const transformedNotifications = response.data.map(transformActivityToNotification);

          // Remove duplicates based on activity ID or content
          const uniqueNotifications = transformedNotifications.filter((notification, index, self) =>
            index === self.findIndex(n =>
              n.id === notification.id ||
              (n.message === notification.message &&
               n.title === notification.title &&
               n.type === notification.type)
            )
          );

          setNotifications(uniqueNotifications);
        } else {
          setError(response.error || 'Failed to load notifications');
        }
      } catch (err) {
        setError('Failed to load notifications');
        console.error('Error loading notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "All" || notification.type === filterType;
    return matchesSearch && matchesType;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id) => {
    try {
      const response = await markNotificationAsRead(id);

      if (response.success) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id
              ? { ...notification, isRead: true }
              : notification
          )
        );
      } else {
        console.error('Failed to mark notification as read:', response.error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await deleteNotification(id);

      if (response.success) {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
      } else {
        console.error('Failed to delete notification:', response.error);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAllRead(true);
    try {
      const response = await markAllNotificationsAsRead();

      if (response.success) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, isRead: true }))
        );
      } else {
        console.error('Failed to mark all notifications as read:', response.error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      const response = await acceptInvitationFromNotification(invitationId);

      if (response.success) {
        // Refresh notifications to show updated status
        const notificationsResponse = await getNotifications(100, 1);
        if (notificationsResponse.success) {
          const transformedNotifications = notificationsResponse.data.map(transformActivityToNotification);

          // Remove duplicates
          const uniqueNotifications = transformedNotifications.filter((notification, index, self) =>
            index === self.findIndex(n =>
              n.id === notification.id ||
              (n.message === notification.message &&
               n.title === notification.title &&
               n.type === notification.type)
            )
          );

          setNotifications(uniqueNotifications);
        }
      } else {
        console.error('Failed to accept invitation:', response.error);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDeclineInvitation = async (invitationId) => {
    try {
      const response = await declineInvitationFromNotification(invitationId);

      if (response.success) {
        // Refresh notifications to show updated status
        const notificationsResponse = await getNotifications(100, 1);
        if (notificationsResponse.success) {
          const transformedNotifications = notificationsResponse.data.map(transformActivityToNotification);

          // Remove duplicates
          const uniqueNotifications = transformedNotifications.filter((notification, index, self) =>
            index === self.findIndex(n =>
              n.id === notification.id ||
              (n.message === notification.message &&
               n.title === notification.title &&
               n.type === notification.type)
            )
          );

          setNotifications(uniqueNotifications);
        }
      } else {
        console.error('Failed to decline invitation:', response.error);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      const response = await clearAllNotifications();

      if (response.success) {
        setNotifications([]);
      } else {
        console.error('Failed to clear all notifications:', response.error);
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    } finally {
      setIsClearingAll(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString();
  };

  // Update timestamps to show relative time
  const notificationsWithFormattedTime = filteredNotifications.map(notification => ({
    ...notification,
    timestamp: formatTimestamp(notification.timestamp)
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A78BFA] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading notifications...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="text-center">
              <Bell className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-400 text-lg mb-2">Failed to load notifications</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
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
                  disabled={isMarkingAllRead}
                  className="rounded-xl bg-green-600/20 px-4 py-3 text-sm font-bold text-green-400 border border-green-500/30 hover:bg-green-600/30 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isMarkingAllRead && <Loader2 className="animate-spin" size={16} />}
                  {isMarkingAllRead ? 'Marking...' : 'Mark All Read'}
                </button>
              )}
              <button
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="rounded-xl bg-red-600/20 px-4 py-3 text-sm font-bold text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isClearingAll && <Loader2 className="animate-spin" size={16} />}
                {isClearingAll ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg transform hover:scale-105 transition-all duration-300 hover:border-[#A78BFA]/30">
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

          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg transform hover:scale-105 transition-all duration-300 hover:border-[#A78BFA]/30">
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

          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg transform hover:scale-105 transition-all duration-300 hover:border-[#A78BFA]/30">
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filterType === type.value
                  ? 'bg-[#A78BFA] text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20'
                  : 'bg-[#1E1E1E]/50 border border-gray-700 text-gray-300 hover:border-[#A78BFA]/50 hover:text-white hover:bg-[#A78BFA]/10'
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
            {notificationsWithFormattedTime.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                onAcceptInvitation={handleAcceptInvitation}
                onDeclineInvitation={handleDeclineInvitation}
              />
            ))}
          </div>
          {notificationsWithFormattedTime.length === 0 && (
            <div className="text-center py-12 min-h-[calc(100vh-20rem)] flex items-center justify-center">
              <div>
                <Bell className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-500 text-lg">No notifications found</p>
                <p className="text-gray-400 text-sm mt-2">Try a different search or filter</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Notifications;
