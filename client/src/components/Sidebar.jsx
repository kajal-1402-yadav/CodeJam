import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Users, FilePlus, Settings, Bell, LogOut, Menu, User } from "lucide-react";
import useAuthContext from "../hooks/useAuthContext";
import useLogout from "../hooks/useLogout";

const ProfilePopup = ({ isVisible, onToggle, onLogout }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onToggle();
      }
    };
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onToggle]);

  if (!isVisible) return null;

  return (
    <div ref={popupRef} className="absolute bottom-full mb-3 w-full bg-[#1E1E1E] border border-gray-700 rounded-lg shadow-lg p-2">
      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors">
        <User size={18} />
      </button>
      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors">
        <Settings size={18} />
        <span>Settings</span>
      </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button onClick={() => onLogout()} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
    </div>
  );
};

const Sidebar = () => {
  const { user } = useAuthContext();
  const { logout } = useLogout();
  const [isProfilePopupVisible, setIsProfilePopupVisible] = useState(false);
  const navItems = [
    { name: "Dashboard", icon: Users },
    { name: "Rooms", icon: FilePlus },
    { name: "Contributors", icon: Users },
    { name: "Templates", icon: Settings },
    { name: "Notifications", icon: Bell },
  ];

  return (
    <aside className="fixed top-0 left-0 h-full bg-[#1E1E1E] text-gray-300 flex flex-col border-r border-gray-800 w-64 z-50">
      <div className="flex flex-col flex-grow">
        <div className="flex items-center h-20 px-4">
          <div className="flex items-center gap-2">
            <svg className="h-8 w-8 text-[#A78BFA] flex-shrink-0" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
            </svg>
            <span className="text-xl font-bold text-white">CodeJam</span>
          </div>
        </div>

        <nav className="flex-grow px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 hover:bg-gray-800 hover:text-white"
                aria-label={item.name}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 py-5 border-t border-gray-800 relative">
        <ProfilePopup isVisible={isProfilePopupVisible} onToggle={() => setIsProfilePopupVisible(false)} onLogout={logout} />
        <button
          onClick={() => setIsProfilePopupVisible(!isProfilePopupVisible)}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {user && (
            <>
              <div className="w-10 h-10 rounded-full bg-[#A78BFA] flex items-center justify-center text-white font-bold text-lg">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white">{user.username}</span>
                <span className="text-sm text-gray-400">{user.email}</span>
              </div>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
