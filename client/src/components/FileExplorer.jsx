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
  const [isRoomExpanded, setIsRoomExpanded] = useState(true);

  const handleContextMenu = (e, item, type = 'file') => {
    e.preventDefault();
    const { pageX, pageY } = e;
    setContextMenu({ x: pageX, y: pageY, item, type });
    onContextMenu(e, item, type);
  };

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-800 p-3 space-y-3 bg-[#1E1E1E]">
      <button onClick={onNavigateBack} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-transparent hover:bg-gray-800/50 transition-all duration-200 group">
        <ChevronLeft size={16} className="text-gray-400" />
        <div className="flex items-center gap-4">
          <svg className="h-8 w-8 text-[#A78BFA]" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
          </svg>
          <h2 className="text-xl font-bold text-white">{roomName || "Room"}</h2>
        </div>
      </button>

      <div className="flex-1 min-h-0">
        <div className="space-y-1 h-full overflow-y-auto scrollbar-hide">
          {/* Root Room Folder - Always visible and expandable */}
          <div>
            <div
              className="flex items-center justify-between px-2 py-1 rounded bg-gray-800/50 cursor-pointer group"
              onClick={() => setIsRoomExpanded(!isRoomExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  size={12}
                  className={`transform transition-transform ${isRoomExpanded ? 'rotate-90' : ''}`}
                />
                <span className="text-sm font-semibold text-gray-200">{roomName || "Room"}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onSetCreatingIn({ type: 'folder' }); }} className="p-1 rounded hover:bg-gray-700" title="New Folder">
                  <FolderIcon size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onSetCreatingIn({ type: 'file' }); }} className="p-1 rounded hover:bg-gray-700" title="New File">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Room contents - only show if expanded */}
            {isRoomExpanded && (
              <div className="ml-4">
              {/* Sub Folders within room */}
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

              {/* Root level creation forms within room */}
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

          {(folders.length === 0 && files.length === 0) && (
            <div className="text-xs text-gray-500">No files yet. Create one to start.</div>
          )}
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
