import { useState, useRef, useEffect } from "react";
import {
  Plus,
  File as FileIcon,
  Folder as FolderIcon,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Search,
  Loader2,
  FileCode,
  FileJson,
  FileText,
  Image as ImageIcon,
  FileType
} from "lucide-react";
// ContextMenu is handled by RoomEditor

// Inline form component for editing file/folder names
const InlineForm = ({ defaultValue = '', onSubmit, onCancel, placeholder, autoFocus = true }) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    if (trimmedValue) {
      onSubmit(trimmedValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-purple-500 rounded outline-none text-gray-200"
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <div className="flex items-center gap-1">
        <button
          type="submit"
          className="p-1 hover:bg-gray-700 rounded text-green-400"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-gray-700 rounded text-gray-400"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </form>
  );
};

const FileExplorer = ({
  files,
  folders,
  activeFileId,
  expandedFolders,
  editingItem,
  creatingIn,
  onFileSelect,
  onToggleFolder,
  onContextMenu,
  onSetEditingItem,
  onSetCreatingIn,
  onAddFile,
  onAddFolder,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
  roomName,
  onNavigateBack
}) => {
  // Find the root folder (folder with room name and no parent)
  const rootFolder = folders.find(f => !f.parent && f.name === roomName);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const containerRef = useRef(null);

  const handleContextMenu = (e, item, type = 'file') => {
    e.preventDefault();
    onContextMenu(e, item, type);
  };

  // Get file icon based on extension
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const iconProps = { size: 14, className: "text-gray-400" };
    
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode {...iconProps} className="text-yellow-400" />;
      case 'json':
        return <FileJson {...iconProps} className="text-green-400" />;
      case 'html':
      case 'htm':
        return <FileCode {...iconProps} className="text-orange-400" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <FileType {...iconProps} className="text-blue-400" />;
      case 'md':
      case 'txt':
        return <FileText {...iconProps} className="text-gray-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <ImageIcon {...iconProps} className="text-purple-400" />;
      default:
        return <FileIcon {...iconProps} />;
    }
  };

  // Filter files and folders based on search query
  const filterBySearch = (items, isFolder = false) => {
    if (!searchQuery.trim()) return items;
    return items.filter(item => {
      const name = isFolder ? item.name : item.filename;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingItem || creatingIn) return; // Don't interfere with editing

      if (e.key === 'Delete' && activeFileId) {
        const file = files.find(f => f._id === activeFileId);
        if (file) {
          setDeleteConfirm({ item: file, type: 'file' });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, files, editingItem, creatingIn]);

  // Recursive component to render folders and their contents
  const FolderItem = ({ folder, depth = 0 }) => {
    const subfolders = folders.filter(f => String(f.parent) === String(folder._id));
    const folderFiles = files.filter(f => String(f.folder) === String(folder._id));

    return (
      <div key={folder._id}>
        <div
          className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-800 cursor-pointer group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onToggleFolder(folder._id)}
          onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
        >
          <div className="flex items-center gap-2">
            <ChevronRight
              size={12}
              className={`transform transition-transform ${
                expandedFolders.has(folder._id) ? 'rotate-90' : ''
              }`}
            />
            <FolderIcon size={16} className="text-blue-400" />
            {editingItem?.id === folder._id ? (
              <InlineForm
                defaultValue={folder.name}
                onSubmit={(value) => {
                  onRenameFolder(folder, value);
                  onSetEditingItem(null);
                }}
                onCancel={() => onSetEditingItem(null)}
                placeholder="Folder name"
              />
            ) : (
              <span className="text-sm truncate">{folder.name}</span>
            )}
          </div>
        </div>

        {expandedFolders.has(folder._id) && (
          <div className="ml-4">
            {/* Create file inside folder */}
            {creatingIn?.id === folder._id && creatingIn.type === 'file' && (
              <div className="px-2 py-1">
                <InlineForm
                  placeholder="File name"
                  onSubmit={async (name) => {
                    await onAddFile(name, folder._id);
                    onSetCreatingIn(null);
                  }}
                  onCancel={() => onSetCreatingIn(null)}
                />
              </div>
            )}

            {/* Create subfolder inside folder */}
            {creatingIn?.id === folder._id && creatingIn.type === 'folder' && (
              <div className="px-2 py-1">
                <InlineForm
                  placeholder="Folder name"
                  onSubmit={async (name) => {
                    await onAddFolder(name, folder._id);
                    onSetCreatingIn(null);
                  }}
                  onCancel={() => onSetCreatingIn(null)}
                />
              </div>
            )}

            {/* Render subfolders recursively */}
            {subfolders.map(subfolder => (
              <FolderItem key={subfolder._id} folder={subfolder} depth={depth + 1} />
            ))}

            {/* Render files in this folder */}
            {filterBySearch(folderFiles).map(f => (
              <div
                key={f._id}
                className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                  activeFileId === f._id ? 'bg-gray-800' : 'hover:bg-gray-800/60'
                } ${draggedItem?._id === f._id ? 'opacity-50' : ''}`}
                style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                onClick={() => onFileSelect(f._id, f.content || "")}
                onContextMenu={(e) => handleContextMenu(e, f, 'file')}
                draggable
                onDragStart={() => setDraggedItem(f)}
                onDragEnd={() => setDraggedItem(null)}
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(f.filename)}
                  {editingItem?.id === f._id ? (
                    <InlineForm
                      defaultValue={f.filename}
                      onSubmit={(value) => {
                        onRenameFile(f, value);
                        onSetEditingItem(null);
                      }}
                      onCancel={() => onSetEditingItem(null)}
                      placeholder="File name"
                    />
                  ) : (
                    <span className="text-sm truncate">{f.filename}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="w-72 flex-shrink-0 border-r border-gray-800 bg-[#1E1E1E] flex flex-col h-full"
      onClick={(e) => {
        // Clicking on empty explorer area selects parent (root) and closes inputs
        if (e.target === e.currentTarget) {
          // Expand and focus root folder
          if (rootFolder && !expandedFolders.has(rootFolder._id)) {
            onToggleFolder(rootFolder._id);
          }
          // Close any inline forms
          if (creatingIn) onSetCreatingIn(null);
          if (editingItem) onSetEditingItem(null);
        }
      }}
    >
      {/* Header with back button and room name */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-4 px-4 py-3 rounded-lg bg-transparent hover:bg-gray-800/50 transition-all duration-200 group w-full"
        >
          <ChevronLeft size={16} className="text-gray-400" />
          <div className="flex items-center gap-4">
            <svg className="h-8 w-8 text-[#A78BFA]" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
            </svg>
            <h2 className="text-xl font-bold text-white">{roomName || "Room"}</h2>
          </div>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#2D2D2D] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* File/Folder List - Flexible space */}
      <div 
        ref={containerRef}
        className="flex-1 min-h-0 p-3"
      >
        <div className="space-y-1 h-full overflow-y-auto scrollbar-hide">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-[#A78BFA]" />
            </div>
          )}
          
          {/* Show root folder if it exists */}
          {rootFolder && (
            <FolderItem key={rootFolder._id} folder={rootFolder} depth={0} />
          )}
          
          {/* Show other root-level folders (for backwards compatibility) */}
          {filterBySearch(folders.filter(f => !f.parent && f._id !== rootFolder?._id), true).map(folder => (
            <FolderItem key={folder._id} folder={folder} depth={0} />
          ))}

          {/* Root level creation forms are now handled inside FolderItem */}

          {(folders.length === 0 && files.length === 0) && (
            <div className="text-xs text-gray-500">No files yet. Create one to start.</div>
          )}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="p-3 border-t border-gray-800">
        <div className="space-y-2">
          <button
            onClick={() => {
              // Create inside root folder if it exists
              if (rootFolder) {
                if (!expandedFolders.has(rootFolder._id)) {
                  onToggleFolder(rootFolder._id);
                }
                onSetCreatingIn({ type: 'file', id: rootFolder._id });
              } else {
                onSetCreatingIn({ type: 'file' });
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#A78BFA] hover:bg-[#8B5CF6] text-white rounded-lg transition-colors duration-200"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">New File</span>
          </button>

          <button
            onClick={() => {
              // Create inside root folder if it exists
              if (rootFolder) {
                if (!expandedFolders.has(rootFolder._id)) {
                  onToggleFolder(rootFolder._id);
                }
                onSetCreatingIn({ type: 'folder', id: rootFolder._id });
              } else {
                onSetCreatingIn({ type: 'folder' });
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#A78BFA] hover:bg-[#8B5CF6] text-white rounded-lg transition-colors duration-200"
          >
            <FolderIcon size={16} />
            <span className="text-sm font-medium">New Folder</span>
          </button>

          <button
            onClick={() => {
              // TODO: Implement file upload functionality
              console.log('Upload file functionality to be implemented');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#A78BFA] hover:bg-[#8B5CF6] text-white rounded-lg transition-colors duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            <span className="text-sm font-medium">Upload File</span>
          </button>
        </div>
      </div>

      {/* Context Menu is handled by RoomEditor */}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-3">Confirm Delete</h3>
            <p className="text-gray-300 mb-2">
              Are you sure you want to delete{' '}
              <span className="text-white font-semibold">
                "{deleteConfirm.type === 'file' ? deleteConfirm.item.filename : deleteConfirm.item.name}"
              </span>?
            </p>
            <p className="text-gray-500 text-sm mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsLoading(true);
                  if (deleteConfirm.type === 'file') {
                    await onDeleteFile(deleteConfirm.item);
                  } else {
                    await onDeleteFolder(deleteConfirm.item);
                  }
                  setIsLoading(false);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
