import { useState, useEffect } from 'react';
import { Activity, MessageSquare, Trash2, Edit, Plus, Code } from 'lucide-react';
import useAuthContext from '../hooks/useAuthContext';
import { getActivities, getRoomActivities } from '../services/activityService';
import { io } from "socket.io-client";

const RoomActivity = ({ roomId, showAllActivities = false, maxItems = 5 }) => {
  const { user } = useAuthContext();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, [roomId, showAllActivities]);

  // Socket connection for real-time activity updates
  useEffect(() => {
    if (!showAllActivities) return; // Only listen for real-time updates when showing all activities

    console.log('Setting up socket connection for room activity updates');
    const socket = io('http://localhost:4000');

    // Listen for new activities and add them to the list (with deduplication)
    socket.on('activityCreated', (newActivity) => {
      console.log('Received new activity:', newActivity);

      // Check if this activity should be shown in the activity feed
      const shouldShowInFeed = [
        'file_created', 'file_deleted', 'file_renamed', 'file_edited',
        'message_sent', 'code_executed', 'user_joined', 'user_left',
        'room_created', 'room_updated', 'room_deleted'
      ].includes(newActivity.type);

      if (shouldShowInFeed) {
        setActivities(prev => {
          // Check if this activity already exists to prevent duplicates
          const exists = prev.some(activity => {
            // Exact ID match (fastest check)
            if (activity._id === newActivity._id) return true;

            // Content-based match for similar activities within time window
            if (activity.description === newActivity.description &&
                activity.user?._id === newActivity.user?._id &&
                activity.room?._id === newActivity.room?._id &&
                activity.type === newActivity.type) {

              // Check if activities are within 30 seconds of each other
              const timeDiff = Math.abs(new Date(activity.createdAt) - new Date(newActivity.createdAt));
              return timeDiff < 30000; // 30 seconds
            }

            return false;
          });

          if (exists) {
            return prev; // Don't add duplicate
          }

          // Add new activity and keep only the specified max items
          return [newActivity, ...prev.slice(0, maxItems - 1)];
        });
      }
    });

    // Listen for room deletion events and filter out activities from deleted rooms
    socket.on('roomDeleted', ({ roomId: deletedRoomId, roomName }) => {
      console.log(`Room "${roomName}" was deleted - filtering out its activities`);
      setActivities(prev => prev.filter(activity => activity.room?._id !== deletedRoomId));
    });

    return () => {
      console.log('Cleaning up room activity socket connection');
      socket.off('activityCreated');
      socket.off('roomDeleted');
      socket.disconnect();
    };
  }, [showAllActivities, maxItems]); // Re-run when showAllActivities or maxItems changes

  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);

    let result;
    if (showAllActivities) {
      // Get activities for all user's rooms
      result = await getActivities();
    } else if (roomId) {
      // Get activities for specific room
      result = await getRoomActivities(roomId);
    } else {
      setIsLoading(false);
      return;
    }

    if (result.success) {
      const rawActivities = Array.isArray(result.data) ? result.data : result.data.activities || [];

      // Remove duplicates based on activity ID or content (with time consideration)
      const uniqueActivities = rawActivities.filter((activity, index, self) => {
        const thirtySecondsAgo = Date.now() - 30000;

        return index === self.findIndex(a => {
          // Exact ID match (fastest check)
          if (a._id === activity._id) return true;

          // Content-based match for similar activities within time window
          if (a.description === activity.description &&
              a.user?._id === activity.user?._id &&
              a.room?._id === activity.room?._id &&
              a.type === activity.type) {

            // Check if activities are within 30 seconds of each other
            const timeDiff = Math.abs(new Date(a.createdAt) - new Date(activity.createdAt));
            return timeDiff < 30000; // 30 seconds
          }

          return false;
        });
      });

      setActivities(uniqueActivities);
    } else {
      console.error('Error fetching activities:', result.error);
      setError(result.error);
    }
    
    setIsLoading(false);
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
      // Invitation activities are not shown in history (handled by NotificationController)
      default:
        return <Activity size={16} className="text-gray-500" />;
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
      // Only exclude invitation-related activities since they're handled by NotificationController
      // user_joined and user_left should show in activity feed as they're "Both Activity + Notifications"
      const excludedTypes = [
        'invitation_sent',
        'invitation_accepted',
        'invitation_declined'
      ];
      return !excludedTypes.includes(activity.type);
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
        <Activity size={48} className="mx-auto text-gray-500 mb-4" />
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
