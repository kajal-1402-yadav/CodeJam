import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// Helper to combine HTML, CSS and JS for preview
function buildHtmlPreview(htmlContent, cssList) {
  // Insert all CSS into a <style> tag in the <head>
  const styleTag = `<style>\n${cssList.join('\n')}\n</style>`;
  // Try to inject into <head>, or at the top if no <head>
  if (/<head[\s>]/i.test(htmlContent)) {
    return htmlContent.replace(/<head([\s>])/i, `<head$1${styleTag}`);
  } else if (/<html[\s>]/i.test(htmlContent)) {
    return htmlContent.replace(/<html([\s>])/i, `<html$1<head>${styleTag}</head>`);
  } else {
    return `<head>${styleTag}</head>\n${htmlContent}`;
  }
}
import { useParams, useNavigate, Link } from "react-router-dom";
import { Edit, Trash2, Folder as FolderIcon, Plus } from "lucide-react";
import FileExplorer from "../components/FileExplorer";
import Topbar from "../components/Topbar";
import Terminal from "../components/Terminal";
import ChatPanel from "../components/ChatPanel";
import EditorArea from "../components/EditorArea";
import FileTabs from "../components/FileTabs";
import ContextMenu, { ContextMenuItem } from "../components/ContextMenu";
import useAuthContext from "../hooks/useAuthContext";
import { useSocket } from "../context/SocketContext";
import { useRoomData } from "../hooks/useRoomData";
import { useSocketHandler } from "../hooks/useSocketHandler";
import { useEditorTabs } from "../hooks/useEditorTabs";
import { useCodeExecution } from "../hooks/useCodeExecution";
import { useChatHandler } from "../hooks/useChatHandler";
import { updateFile } from "../services/fileService";
import { languageByFilename } from "../utils/languageByFilename";

export default function RoomEditor() {
  const { user } = useAuthContext();
  const socket = useSocket();
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(176); // ~h-44
  const isDraggingTerm = useRef(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [creatingIn, setCreatingIn] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [fileToOpen, setFileToOpen] = useState(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(null); // width of editor pane in px
  const isDraggingPreview = useRef(false);

  const [terminalLines, setTerminalLines] = useState([]);
  const appendTerminal = useCallback((text) => {
    setTerminalLines(prev => [...prev, text]);
  }, []);

  const {
    files, setFiles, folders, setFolders, room, setRoom, loading,
    handleAddFile, handleAddFolder, handleRenameFile, handleDeleteFile,
    handleRenameFolder, handleDeleteFolder
  } = useRoomData(roomId, socket, appendTerminal);
  
  const {
    openTabs, setOpenTabs, activeFileId, setActiveFileId, activeContent, setActiveContent,
    tabContents, updateTabContent, selectedLanguage, setSelectedLanguage, activeFile, openTabsData,
    switchToFile, handleCloseTab, saveCurrentFile, saveTimeoutRef
  } = useEditorTabs(roomId, files, setFiles);
  
  const {
    isTerminalOpen, setIsTerminalOpen, cwd,
    handleExecute, toggleTerminal
  } = useCodeExecution({ activeFile, activeContent, folders, room, appendTerminal, setTerminalLines });

  const {
    isChatOpen, setIsChatOpen, chatMessages, chatInput, setChatInput,
    sendMessage, handleEditMessage, handleDeleteMessage: deleteChatMessage
  } = useChatHandler(socket, roomId);

  useSocketHandler({
    socket, roomId, setFiles, setFolders, setActiveFileId, setActiveContent, setOpenTabs, appendTerminal, activeFileId, user
  });

  // Initial file opening logic
  useEffect(() => {
    if (!loading && files.length > 0 && !activeFileId) {
        const rootFolder = folders.find(f => !f.parent && f.name === room.name);
        if (rootFolder) {
          setExpandedFolders(prev => new Set([...Array.from(prev), rootFolder._id]));
        }

        const lastActiveFileId = localStorage.getItem(`${roomId}_activeFileId`);
        if (lastActiveFileId && files.find(f => f._id === JSON.parse(lastActiveFileId))) {
            switchToFile(JSON.parse(lastActiveFileId));
        } else {
            switchToFile(files[0]._id);
        }
    }
  }, [loading, files, activeFileId, switchToFile, roomId, folders, room]);

  // Effect to open a newly created file
  useEffect(() => {
    if (fileToOpen && files.find(f => f._id === fileToOpen)) {
      switchToFile(fileToOpen);
      setFileToOpen(null);
    }
  }, [fileToOpen, files, switchToFile]);

  // Terminal height drag handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingTerm.current) return;
      const delta = window.innerHeight - e.clientY;
      const clamped = Math.max(120, Math.min(Math.floor(delta), Math.floor(window.innerHeight * 0.8)));
      setTerminalHeight(clamped);
    };
    const onUp = () => {
      isDraggingTerm.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);
    
  // Preview/Editor splitter drag handlers (left-right)
  useEffect(() => {
    // Initialize leftWidth to 60% of container on mount
    const init = () => {
      const container = containerRef.current;
      const w = container ? container.clientWidth : window.innerWidth;
      setLeftWidth(Math.floor(w * 0.6));
    };
    init();

    const onMove = (e) => {
      if (!isDraggingPreview.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newLeft = e.clientX - rect.left;
      const clamped = Math.max(200, Math.min(newLeft, rect.width - 200));
      setLeftWidth(clamped);
    };
    const onUp = () => {
      isDraggingPreview.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', init);
    };
  }, []);

  // Auto-adjust preview/terminal based on file type when switching files
  useEffect(() => {
    if (!activeFile) {
      setIsPreviewOpen(false);
      return;
    }

    const isHtmlFile = activeFile.language === "html" || /\.html$/i.test(activeFile.filename);
    if (isHtmlFile) {
      setIsPreviewOpen(true);
      setIsTerminalOpen(false);
    } else {
      setIsTerminalOpen(false);
    }
  }, [activeFile]);

  // Save file before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Capture current values at the time of unload
      const currentActiveFileId = activeFileId;
      const currentActiveContent = activeContent;
      
      if (currentActiveFileId && currentActiveContent) {
        // Save to localStorage immediately (synchronous and reliable)
        try {
          localStorage.setItem(`${roomId}_lastContent_${currentActiveFileId}`, currentActiveContent);
          localStorage.setItem(`${roomId}_lastActiveFile`, currentActiveFileId);
        } catch (error) {
          console.error('Failed to save to localStorage on unload:', error);
        }

        // Use sendBeacon for more reliable delivery to server
        const data = JSON.stringify({
          content: currentActiveContent
        });

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const beaconUrl = `${apiUrl}/api/files/${roomId}/files/${currentActiveFileId}`;
        
        // Try sendBeacon first
        const beaconSent = navigator.sendBeacon && navigator.sendBeacon(beaconUrl, new Blob([data], { type: 'application/json' }));
        
        if (!beaconSent) {
          // Fallback to synchronous XMLHttpRequest
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', `/api/files/${roomId}/files/${currentActiveFileId}`, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          try {
            xhr.send(data);
          } catch (error) {
            console.error('Failed to save on unload:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeFileId, activeContent, roomId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debounced version for performance - save every 500ms to database for more responsive feel
  const debouncedHandleChange = useCallback(async (value) => {
    setActiveContent(value ?? "");
    updateTabContent(activeFileId, value ?? "");
    setAutoSaveStatus('saved'); // reset status

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      if (activeFile && value !== undefined) {
        setAutoSaveStatus('saving');
        const result = await updateFile(roomId, activeFile._id, { content: value });

        if (result.success) {
          setAutoSaveStatus('saved');
          if (socket && user) {
            socket.emit("updateFile", { 
              roomId, 
              fileId: activeFile._id, 
              newContent: value,
              userId: user._id 
            });
          }
        } else {
          console.error('Auto-save failed:', result.error);
          setAutoSaveStatus('error');
        }
      }
    }, 500);
  }, [socket, activeFile, roomId, activeFileId]);
  

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    
    const result = await updateFile(roomId, activeFile._id, { content: activeContent });
    
    if (result.success) {
      appendTerminal(`Saved ${activeFile.filename}`);
    } else {
      appendTerminal(`Failed to save ${activeFile.filename}: ${result.error}`);
    }
    
    setIsSaving(false);
  };

  const onAddFile = async (filename, folderId = null) => {
    const newFile = await handleAddFile(filename, folderId);
    if (newFile) {
      setFileToOpen(newFile._id);
      setCreatingIn(null);
    }
  };

  const onAddFolder = async (name, parentFolderId = null) => {
    await handleAddFolder(name, parentFolderId);
    setCreatingIn(null);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const handleContextMenu = (e, item, type = 'file') => {
    e.preventDefault();
    const { pageX, pageY } = e;
    setContextMenu({ x: pageX, y: pageY, item, type });
  };
  return (
    <div className="flex h-screen overflow-hidden bg-[#1E1E1E] text-gray-200" onClick={() => setContextMenu(null)}>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
          {contextMenu.type === 'file' && (
            <>
              <ContextMenuItem
                icon={Edit}
                onClick={() => {
                  setEditingItem({ id: contextMenu.item._id, type: 'file' });
                  setContextMenu(null);
                }}
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                icon={Trash2}
                onClick={() => {
                  handleDeleteFile(contextMenu.item._id).then(success => success && handleCloseTab(contextMenu.item._id));
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
                  setCreatingIn({ id: contextMenu.item._id, type: 'file' });
                  setExpandedFolders(prev => new Set([...prev, contextMenu.item._id]));
                  setContextMenu(null);
                }}
              >
                New File
              </ContextMenuItem>
              <ContextMenuItem
                icon={FolderIcon}
                onClick={() => {
                  setCreatingIn({ id: contextMenu.item._id, type: 'folder' });
                  setContextMenu(null);
                }}
              >
                New Folder
              </ContextMenuItem>
              <ContextMenuItem
                icon={Edit}
                onClick={() => {
                  setEditingItem({ id: contextMenu.item._id, type: 'folder' });
                  setContextMenu(null);
                }}
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                icon={Trash2}
                onClick={() => {
                  handleDeleteFolder(contextMenu.item);
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

      {/* Sidebar */}
      <FileExplorer
        files={files}
        folders={folders}
        activeFileId={activeFileId}
        expandedFolders={expandedFolders}
        editingItem={editingItem}
        creatingIn={creatingIn}
        onFileSelect={switchToFile}
        onToggleFolder={toggleFolder}
        onContextMenu={handleContextMenu}
        onSetEditingItem={setEditingItem}
        onSetCreatingIn={setCreatingIn}
        onAddFile={onAddFile}
        onAddFolder={onAddFolder}
        onRenameFile={handleRenameFile}
        onRenameFolder={handleRenameFolder}
        onDeleteFile={handleDeleteFile}
        onDeleteFolder={handleDeleteFolder}
        roomName={room?.name}
        onNavigateBack={() => navigate(-1)}
      />

      {/* Right side - Main content area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Main editor */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Topbar */}
          <Topbar
            activeFile={activeFile}
            selectedLanguage={selectedLanguage}
            isSaving={isSaving}
            autoSaveStatus={autoSaveStatus}
            isPreviewOpen={isPreviewOpen}
            onSave={handleSave}
            onRun={() => {
              handleExecute();
              setIsTerminalOpen(true);
            }}
            onTogglePreview={() => setIsPreviewOpen(v => !v)}
            onToggleChat={() => setIsChatOpen(v => !v)}
            onLanguageChange={setSelectedLanguage}
          />

          {/* File Tabs */}
          <FileTabs
            files={openTabsData}
            activeFileId={activeFileId}
            onFileSelect={switchToFile}
            onCloseFile={handleCloseTab}
          />

          {/* Editor + Preview */}
          {openTabs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-[#1E1E1E] text-gray-400">
              <div className="text-center">
                <div className="text-lg mb-2">Welcome to CodeJam!</div>
                <div className="text-sm">Select a file from the explorer to start coding</div>
                <div className="text-xs mt-4 text-gray-500">
                  Collaborate in real-time • Run code instantly • Share your workspace
                </div>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="flex-1 flex overflow-hidden">
              <div style={{ width: leftWidth ? `${leftWidth}px` : '60%' }} className="flex-shrink-0 flex flex-col min-w-0">
                <EditorArea
                  activeContent={activeContent}
                  selectedLanguage={selectedLanguage}
                  onEditorMount={(editor) => {
                    editorRef.current = editor;
                    setTimeout(() => editor.focus(), 100);
                  }}
                  onContentChange={debouncedHandleChange}
                  roomId={roomId}
                  files={files}
                  folders={folders}
                  activeFileId={activeFileId}
                />
              </div>
              {isPreviewOpen && activeFile && (activeFile.language === 'html' || /\.html$/i.test(activeFile.filename)) && (
                <>
                  <div
                    className="w-1.5 cursor-col-resize bg-gray-800 hover:bg-gray-700 transition-colors"
                    onMouseDown={() => {
                      isDraggingPreview.current = true;
                      document.body.style.cursor = 'col-resize';
                      document.body.style.userSelect = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const htmlFile = activeFile;
                      const htmlFolder = htmlFile.folder;
                      const cssFiles = files.filter(f =>
                        (f.language === 'css' || /\.css$/i.test(f.filename)) &&
                        f.folder === htmlFolder
                      );
                      const jsFiles = files.filter(f =>
                        (f.language === 'javascript' || /\.js$/i.test(f.filename)) &&
                        f.folder === htmlFolder
                      );
                      const cssContents = cssFiles.map(f => {
                        if (f._id === activeFileId && selectedLanguage === 'css') return activeContent;
                        return tabContents[f._id] ?? f.content ?? '';
                      });
                      const jsContents = jsFiles.map(f => {
                        if (f._id === activeFileId && selectedLanguage === 'javascript') return activeContent;
                        return tabContents[f._id] ?? f.content ?? '';
                      });
                      const htmlContent = tabContents[htmlFile._id] ?? htmlFile.content ?? '';
                      let previewHtml = buildHtmlPreview(htmlContent.replace(/<script[^>]*src=[^>]+><\/script>/gi, ''), cssContents);
                      if (jsContents.length > 0) {
                        const scripts = jsContents.map(code => `<script>${code}\n<\/script>`).join('\n');
                        if (/<\/body>/i.test(previewHtml)) {
                          previewHtml = previewHtml.replace(/<\/body>/i, scripts + '</body>');
                        } else {
                          previewHtml += scripts;
                        }
                      }
                      return (
                        <iframe
                          title="HTML Preview"
                          className="w-full h-full bg-white border-none"
                          sandbox="allow-scripts"
                          srcDoc={previewHtml}
                        />
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Terminal - separate bottom panel with resizer */}
        {isTerminalOpen && (
          <>
            <div
              className="h-1 w-full cursor-row-resize bg-gray-800 hover:bg-gray-700"
              onMouseDown={() => {
                isDraggingTerm.current = true;
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
              }}
            />
            <Terminal isOpen={true} terminalLines={terminalLines} cwd={cwd} height={terminalHeight} />
          </>
        )}
      </div>

      {/* Chat panel */}
      <ChatPanel
        isOpen={isChatOpen}
        messages={chatMessages}
        inputValue={chatInput}
        onInputChange={setChatInput}
        onSendMessage={sendMessage}
        onToggleChat={() => setIsChatOpen(v => !v)}
        onEditMessage={handleEditMessage}
        onDeleteMessage={deleteChatMessage}
        currentUser={user}
      />
    </div>
  );
}
