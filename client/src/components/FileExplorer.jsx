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
  Check
} from "lucide-react";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";

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
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, item, type = 'file') => {
    e.preventDefault();
    const { pageX, pageY } = e;
    setContextMenu({ x: pageX, y: pageY, item, type });
    onContextMenu(e, item, type);
  };

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-800 bg-[#1E1E1E] flex flex-col h-full">
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

      {/* File/Folder List - Flexible space */}
      <div className="flex-1 min-h-0 p-3">
        <div className="space-y-1 h-full overflow-y-auto scrollbar-hide">
          {/* Folders */}
          {folders.map(folder => (
            <div key={folder._id}>
              <div
                className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-800 cursor-pointer group"
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

                  {files.filter(f => String(f.folder) === String(folder._id)).map(f => (
                    <div
                      key={f._id}
                      className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                        activeFileId === f._id ? 'bg-gray-800' : 'hover:bg-gray-800/60'
                      }`}
                      onClick={() => onFileSelect(f._id, f.content || "")}
                      onContextMenu={(e) => handleContextMenu(e, f, 'file')}
                    >
                      <div className="flex items-center gap-2">
                        <FileIcon size={14} className="text-gray-400" />
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
          ))}

          {/* Root level creation forms */}
          {creatingIn?.type === 'folder' && !creatingIn.id && (
            <div className="px-2 py-1">
              <InlineForm
                placeholder="Folder name"
                onSubmit={async (name) => {
                  await onAddFolder(name);
                  onSetCreatingIn(null);
                }}
                onCancel={() => onSetCreatingIn(null)}
              />
            </div>
          )}

          {creatingIn?.type === 'file' && !creatingIn.id && (
            <div className="px-2 py-1">
              <InlineForm
                placeholder="File name"
                onSubmit={async (name) => {
                  await onAddFile(name);
                  onSetCreatingIn(null);
                }}
                onCancel={() => onSetCreatingIn(null)}
              />
            </div>
          )}

          {/* Files without folder (root level files) */}
          {files.filter(f => !f.folder).map(f => (
            <div
              key={f._id}
              className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                activeFileId === f._id ? 'bg-gray-800' : 'hover:bg-gray-800/60'
              }`}
              onClick={() => onFileSelect(f._id, f.content || "")}
              onContextMenu={(e) => handleContextMenu(e, f, 'file')}
            >
              <div className="flex items-center gap-2">
                <FileIcon size={14} className="text-gray-400" />
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

          {(folders.length === 0 && files.length === 0) && (
            <div className="text-xs text-gray-500">No files yet. Create one to start.</div>
          )}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="p-3 border-t border-gray-800">
        <div className="space-y-2">
          <button
            onClick={() => onSetCreatingIn({ type: 'file' })}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#A78BFA] hover:bg-[#8B5CF6] text-white rounded-lg transition-colors duration-200"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">New File</span>
          </button>

          <button
            onClick={() => onSetCreatingIn({ type: 'folder' })}
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
          {contextMenu.type === 'file' && (
            <>
              <ContextMenuItem
                icon={Plus}
                onClick={() => {
                  onSetCreatingIn({ id: null, type: 'file' });
                  setContextMenu(null);
                }}
              >
                New File
              </ContextMenuItem>
              <ContextMenuItem
                icon={Edit}
                onClick={() => {
                  onSetEditingItem({ id: contextMenu.item._id, type: 'file' });
                  setContextMenu(null);
                }}
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                icon={Trash2}
                onClick={() => {
                  onDeleteFile(contextMenu.item);
                  setContextMenu(null);
                }}
                destructive
              >
                Delete
              </ContextMenuItem>
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              <ContextMenuItem
                icon={Plus}
                onClick={() => {
                  onSetCreatingIn({ id: contextMenu.item._id, type: 'file' });
                  setContextMenu(null);
                }}
              >
                New File
              </ContextMenuItem>
              <ContextMenuItem
                icon={FolderIcon}
                onClick={() => {
                  onSetCreatingIn({ id: contextMenu.item._id, type: 'folder' });
                  setContextMenu(null);
                }}
              >
                New Folder
              </ContextMenuItem>
              <ContextMenuItem
                icon={Edit}
                onClick={() => {
                  onSetEditingItem({ id: contextMenu.item._id, type: 'folder' });
                  setContextMenu(null);
                }}
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                icon={Trash2}
                onClick={() => {
                  onDeleteFolder(contextMenu.item);
                  setContextMenu(null);
                }}
                destructive
              >
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenu>
      )}
    </div>
  );
};

export default FileExplorer;
