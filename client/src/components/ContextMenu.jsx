import { useEffect, useRef } from 'react';

const ContextMenu = ({ x, y, onClose, children }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#1E1E1E] border border-gray-700 rounded-lg shadow-lg py-1 z-50"
      style={{
        top: `${y}px`,
        left: `${x}px`,
      }}
    >
      {children}
    </div>
  );
};

export const ContextMenuItem = ({ onClick, icon: Icon, children, className = '', destructive = false }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-800 ${
      destructive ? 'text-red-400 hover:text-red-300' : 'text-gray-200'
    } ${className}`}
  >
    {Icon && <Icon size={14} className="opacity-70" />}
    {children}
  </button>
);

export default ContextMenu;