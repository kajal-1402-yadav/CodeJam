import { useState, useEffect } from "react";
import { Clock, User, FileText, MessageSquare, Plus, Edit, Trash2, Code, Users, Activity as ActivityIcon } from "lucide-react";
import useAuthContext from "../hooks/useAuthContext";
import { io } from "socket.io-client";

const RoomActivity = ({ roomId, showAllActivities = false, maxItems = 5 }) => {
  const { user } = useAuthContext();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, [roomId, showAllActivities]);

  // Socket connection for real-time room deletion updates
  useEffect(() => {
    if (!showAllActivities) return; // Only listen for room deletion events when showing all activities

    console.log('Setting up socket connection for room activity updates');
    const socket = io('http://localhost:4000');

    // Listen for room deletion events and filter out activities from deleted rooms
    socket.on('roomDeleted', ({ roomId: deletedRoomId, roomName }) => {
      console.log(`Room "${roomName}" was deleted - filtering out its activities`);
      setActivities(prev => prev.filter(activity => activity.room?._id !== deletedRoomId));
    });

    return () => {
      console.log('Cleaning up room activity socket connection');
      socket.disconnect();
    };
  }, [showAllActivities]); // Only re-run when showAllActivities changes

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let url;
      if (showAllActivities) {
        // Get activities for all user's rooms
        url = `${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/activities`;
      } else if (roomId) {
        // Get activities for specific room
        url = `${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/rooms/${roomId}/activities`;
      } else {
        return;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(Array.isArray(data) ? data : data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'file_created':
        return <Plus size={16} className="text-green-500" />;
      case 'file_edited':
        return <Edit size={16} className="text-blue-500" />;
      case 'file_deleted':
        return <Trash2 size={16} className="text-red-500" />;
      case 'file_renamed':
        return <Edit size={16} className="text-yellow-500" />;
      case 'message_sent':
        return <MessageSquare size={16} className="text-purple-500" />;
      case 'code_executed':
        return <Code size={16} className="text-orange-500" />;
      case 'room_created':
        return <Plus size={16} className="text-green-500" />;
      case 'room_updated':
        return <Edit size={16} className="text-blue-500" />;
      case 'room_deleted':
        return <Trash2 size={16} className="text-red-500" />;
      // Temporary activities (user_joined, user_left) are not shown in history
      default:
        return <ActivityIcon size={16} className="text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  const displayActivities = activities
    .filter(activity => {
      // Only show permanent activities in history, not temporary ones
      const temporaryTypes = ['user_joined', 'user_left'];
      return !temporaryTypes.includes(activity.type);
    })
    .slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#A78BFA]"></div>
          <span>Loading activities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-2">Failed to load activities</p>
        <button
          onClick={fetchActivities}
          className="text-[#A78BFA] hover:text-[#A78BFA]/80 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <ActivityIcon size={48} className="mx-auto text-gray-500 mb-4" />
        <p className="text-gray-500">No recent activities</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayActivities.map((activity) => (
        <div key={activity._id} className="p-4 rounded-lg bg-[#1E1E1E]/50 border border-gray-800">
          <div className="flex justify-between items-start mb-2">
            <span className="text-white font-medium">{toTitleCase(activity.description.replace(/ in \w+$/, ''))}</span>
            <span className="text-gray-500 text-sm">
              {formatTimeAgo(activity.createdAt)}
            </span>
          </div>
          {activity.room && (
            <div className="text-[#A78BFA] text-sm font-medium">
              {activity.room.name}
            </div>
          )}
        </div>
      ))}

      {activities.length > maxItems && (
        <div className="mt-4 text-center">
          <button className="text-[#A78BFA] hover:text-[#A78BFA]/80 text-sm font-medium">
            View all activities ({activities.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default RoomActivity;
