import { X, Users, User, Calendar, MessageSquare, Check, X as XIcon, Loader2 } from 'lucide-react';

const InvitationModal = ({ 
  isOpen, 
  onClose, 
  invitation, 
  onAccept, 
  onDecline, 
  isProcessing = false 
}) => {
  if (!isOpen || !invitation) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'Unknown';
    
    try {
      const now = new Date();
      const expiry = new Date(expiresAt);
      
      if (isNaN(expiry.getTime())) return 'Invalid Date';
      
      const diffInHours = Math.floor((expiry - now) / (1000 * 60 * 60));
      
      if (diffInHours <= 0) return 'Expired';
      if (diffInHours < 24) return `${diffInHours} hours remaining`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days remaining`;
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return 'Unknown';
    }
  };

  const isExpired = () => {
    if (!invitation?.expiresAt) return false;
    
    try {
      const expiry = new Date(invitation.expiresAt);
      return !isNaN(expiry.getTime()) && expiry < new Date();
    } catch (error) {
      console.error('Error checking expiration:', error);
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 w-full max-w-md overflow-hidden shadow-2xl transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 bg-[#1E1E1E]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-[#A78BFA]/10">
                <Users className="text-[#A78BFA]" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-white">Room Invitation</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 rounded-md hover:bg-gray-800/50 transition-colors text-gray-400 hover:text-gray-200"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Room Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-1">
                {invitation.room?.name || 'Unknown Room'}
              </h3>
              <p className="text-sm text-gray-400">
                You've been invited to join this room
              </p>
            </div>

            {/* Invitation Details */}
            <div className="space-y-3 text-sm">
               <div className="flex items-center gap-3">
                 <User size={16} className="text-gray-500 flex-shrink-0" />
                 <div className="text-gray-300">
                   <span className="text-gray-400">From: </span>
                   <span className="text-white font-medium">
                     {invitation.invitedBy?.username || invitation.invitedBy?.email || 'Unknown User'}
                   </span>
                 </div>
               </div>
               
               <div className="flex items-center gap-3">
                 <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                 <div className="text-gray-300">
                   <span className="text-gray-400">Sent: </span>
                   <span className="text-white">{formatDate(invitation.createdAt)}</span>
                 </div>
               </div>

               <div className="flex items-center gap-3">
                 <Calendar size={16} className={`flex-shrink-0 ${isExpired() ? 'text-red-400' : 'text-gray-500'}`} />
                 <div className={isExpired() ? 'text-red-400' : 'text-gray-300'}>
                   <span className={isExpired() ? 'text-red-400' : 'text-gray-400'}>Expires: </span>
                   <span className={isExpired() ? 'font-medium' : ''}>{getTimeRemaining(invitation.expiresAt)}</span>
                 </div>
               </div>

              {invitation.message && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="flex items-start gap-3">
                    <MessageSquare size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-400 mb-1">Message</p>
                      <p className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg">
                        {invitation.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 mt-4 border-t border-gray-800">
             <div className="flex items-center justify-end space-x-3">
               <button
                 onClick={onDecline}
                 disabled={isProcessing || isExpired()}
                 className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700/80 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isProcessing ? (
                   <Loader2 size={16} className="animate-spin" />
                 ) : (
                   <XIcon size={16} />
                 )}
                 Decline
               </button>
               <button
                 onClick={onAccept}
                 disabled={isProcessing || isExpired()}
                 className="px-4 py-2 text-sm font-medium text-white bg-[#A78BFA] rounded-lg hover:bg-[#8B5CF6] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isProcessing ? (
                   <Loader2 size={16} className="animate-spin" />
                 ) : (
                   <Check size={16} />
                 )}
                 Accept Invitation
               </button>
             </div>
             {isExpired() && (
               <p className="mt-3 text-sm text-center text-red-400">
                 This invitation has expired
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationModal;
