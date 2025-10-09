import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2, Folder as FolderIcon, Plus } from "lucide-react";
import FileExplorer from "../components/FileExplorer";
import Topbar from "../components/Topbar";
import Terminal from "../components/Terminal";
import ChatPanel from "../components/ChatPanel";
import EditorArea from "../components/EditorArea";
import FileTabs from "../components/FileTabs";
import ContextMenu, { ContextMenuItem } from "../components/ContextMenu";
import api from "../utils/axiosConfig";
import useAuthContext from "../hooks/useAuthContext";
import { useSocket } from "../context/SocketContext";

const languageByFilename = (name) => {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js": return "javascript";
    case "ts": return "typescript";
    case "py": return "python";
    case "java": return "java";
    case "c": return "c";
    case "cpp": return "cpp";
    case "html": return "html";
    case "css": return "css";
    case "json": return "json";
    case "md": return "markdown";
    default: return "plaintext";
  }
};

export default function RoomEditor() {
  const { user } = useAuthContext();
  const socket = useSocket();
  const { id: roomId } = useParams();
  const navigate = useNavigate();

  const [openTabs, setOpenTabs] = useState([]);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [room, setRoom] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [activeContent, setActiveContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [creatingIn, setCreatingIn] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("plaintext");
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const didWelcome = useRef(false);
  const editorRef = useRef(null);

  // ======== LocalStorage helpers ========
const loadFromStorage = (key, defaultValue = null) => {
  try {
    const stored = localStorage.getItem(`${roomId}_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(`${roomId}_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const clearStorage = (key) => {
  try { localStorage.removeItem(`${roomId}_${key}`); } catch {}
};

  const [tabContents, setTabContents] = useState(() => loadFromStorage('tabContents', {}));
  const activeFile = useMemo(() => files.find(f => f._id === activeFileId) || null, [files, activeFileId]);
  const openTabsData = useMemo(() => openTabs.map(tabId => files.find(f => f._id === tabId)).filter(Boolean), [openTabs, files]);

  // Update selectedLanguage when active file changes
  useEffect(() => {
    if (!activeFile) {
      setSelectedLanguage("plaintext");
      return;
    }

    // Use file's stored language or detect from filename
    const fileLanguage = activeFile.language || languageByFilename(activeFile.filename);

    // Ensure the language is valid for Monaco Editor
    const validMonacoLanguages = [
      'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp',
      'html', 'css', 'json', 'markdown', 'sql', 'php', 'ruby', 'go', 'rust',
      'swift', 'kotlin', 'scala', 'r', 'matlab', 'shell', 'yaml', 'xml'
    ];

    const finalLanguage = validMonacoLanguages.includes(fileLanguage) ? fileLanguage : 'plaintext';

    setSelectedLanguage(finalLanguage);
  }, [activeFile]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("joinRoom", { roomId, user });
    return () => {
      // Save current file before leaving
      if (activeFileId && activeContent) {
        api.put(`/api/rooms/${roomId}/files/${activeFileId}`, {
          content: activeContent
        }).catch(error => {
          console.error('Failed to save file before leaving room:', error);
        });
      }
      socket.emit("leaveRoom", { roomId, user });
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    const load = async () => {
      try {
        // Only show loading on first mount
  
        const [filesRes, foldersRes, roomRes] = await Promise.all([
          api.get(`/api/rooms/${roomId}/files`),
          api.get(`/api/rooms/${roomId}/folders`),
          api.get(`/api/rooms/${roomId}`)
        ]);
  
        setFiles(filesRes.data);
        setFolders(foldersRes.data);
        setRoom(roomRes.data);

        // Auto-select first file only on first load
        if (!activeFileId && filesRes.data.length) {
          const firstFile = filesRes.data[0];

          // Get fresh content for the first file
          try {
            const response = await api.get(`/api/rooms/${roomId}/files/${firstFile._id}`);
            const freshContent = response.data.content || "";

            setActiveFileId(firstFile._id);
            setActiveContent(freshContent);
            setOpenTabs([firstFile._id]);

            const isHtmlFile = firstFile.language === "html" || /\.html$/i.test(firstFile.filename);
            if (isHtmlFile) {
              setIsPreviewOpen(true);
              setIsTerminalOpen(false);
            } else {
              setIsPreviewOpen(false);
              setIsTerminalOpen(false);
            }
          } catch (error) {
            console.error('Failed to load fresh content for first file:', error);
            // Fallback to original content if fresh load fails
            setActiveFileId(firstFile._id);
            setActiveContent(firstFile.content || "");
            setOpenTabs([firstFile._id]);

            const isHtmlFile = firstFile.language === "html" || /\.html$/i.test(firstFile.filename);
            if (isHtmlFile) {
              setIsPreviewOpen(true);
              setIsTerminalOpen(false);
            } else {
              setIsPreviewOpen(false);
              setIsTerminalOpen(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load room data:", error);
      }
    };
    load();
  }, [roomId]);
  

  // Optimize useEffect dependencies to prevent unnecessary re-renders
  useEffect(() => {
    if (!socket) return;
    const onFileUpdated = ({ fileId, newContent }) => {
      setFiles(prev => prev.map(f => f._id === fileId ? { ...f, content: newContent } : f));
      if (fileId === activeFileId) setActiveContent(newContent);
    };
    const onFileRenamed = ({ fileId, newName }) => {
      setFiles(prev => prev.map(f => f._id === fileId ? { ...f, filename: newName } : f));
    };
    const onFileDeleted = ({ fileId }) => {
      setFiles(prev => prev.filter(f => f._id !== fileId));
      setOpenTabs(prev => prev.filter(id => id !== fileId)); // Remove from open tabs
      if (activeFileId === fileId) {
        const remainingTabs = openTabs.filter(id => id !== fileId);
        if (remainingTabs.length > 0) {
          const nextTabId = remainingTabs[0];
          const nextFile = files.find(f => f._id === nextTabId);
          if (nextFile) {
            setActiveFileId(nextTabId);
            setActiveContent(nextFile.content || "");
          }
        } else {
          setActiveFileId(null);
          setActiveContent("");
        }
      }
    };
    socket.on("fileUpdated", onFileUpdated);
    socket.on("fileRenamed", onFileRenamed);
    socket.on("fileDeleted", onFileDeleted);
    return () => {
      socket.off("fileUpdated", onFileUpdated);
      socket.off("fileRenamed", onFileRenamed);
      socket.off("fileDeleted", onFileDeleted);
    };
  }, [socket, activeFileId]); // Removed files dependency to prevent stale closures
    
  // Auto-adjust preview/terminal based on file type when switching files
  useEffect(() => {
    if (!activeFile) return;

    const isHtmlFile = activeFile.language === "html" || /\.html$/i.test(activeFile.filename);
    if (isHtmlFile) {
      setIsPreviewOpen(true);
      setIsTerminalOpen(false);
    } else {
      setIsPreviewOpen(false);
      // Don't auto-open terminal - let user click Run button
      setIsTerminalOpen(false);
    }
  }, [activeFile]);
  useEffect(() => {
    if (!socket) return;

    const handleHistory = (history) => {
      const list = history || [];
      if (!didWelcome.current) {
        didWelcome.current = true;
        const welcome = {
          _id: `welcome-${roomId}`,
          sender: { username: "System" },
          message: "Welcome to the room! Share files, edit code, and chat in real-time.",
          createdAt: new Date().toISOString(),
        };
        setChatMessages([welcome, ...list]);
      } else {
        setChatMessages(list);
      }
    };

    const handleReceive = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const handleUpdated = (msg) => {
      setChatMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? msg : m))
      );
    };

    const handleDeleted = ({ messageId }) => {
      setChatMessages((prev) =>
        prev.filter((m) => m._id !== messageId)
      );
    };

    socket.on("chatHistory", handleHistory);
    socket.on("receiveMessage", handleReceive);
    socket.on("messageUpdated", handleUpdated);
    socket.on("messageDeleted", handleDeleted);

    return () => {
      socket.off("chatHistory", handleHistory);
      socket.off("receiveMessage", handleReceive);
      socket.off("messageUpdated", handleUpdated);
      socket.off("messageDeleted", handleDeleted);
    };
  }, [socket, roomId]);

  // Save file before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeFileId && activeContent) {
        // Use sendBeacon for more reliable delivery
        const data = JSON.stringify({
          content: activeContent
        });

        // Fallback to synchronous XMLHttpRequest if sendBeacon fails
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/rooms/${roomId}/files/${activeFileId}`, data);
        } else {
          // Fallback for browsers that don't support sendBeacon
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', `/api/rooms/${roomId}/files/${activeFileId}`, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          try {
            xhr.send(data);
          } catch (e) {
            console.error('Failed to save on unload:', e);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeFileId, activeContent, roomId]);

  const saveCurrentFile = async () => {
    if (activeFileId && activeContent !== undefined) {
      try {
        await api.put(`/api/rooms/${roomId}/files/${activeFileId}`, { content: activeContent });
      } catch (error) {
        console.error('Failed to save current file:', error);
      }
    }
  };

  // Debounced version for performance - save every 500ms to database for more responsive feel
  const debouncedHandleChange = useMemo(() => {
    let timeoutId;
    return async (value) => {
      setActiveContent(value ?? "");
      updateTabContent(activeFileId, value ?? "");
      setAutoSaveStatus('saved'); // reset status
  
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (activeFile && value !== undefined) {
          try {
            setAutoSaveStatus('saving');
            await api.put(`/api/rooms/${roomId}/files/${activeFile._id}`, { content: value });
  
            setAutoSaveStatus('saved');
            if (socket) {
              socket.emit("updateFile", { roomId, fileId: activeFile._id, newContent: value });
            }
          } catch (error) {
            console.error('Auto-save failed:', error);
            setAutoSaveStatus('error');
          }
        }
      }, 500);
    };
  }, [socket, activeFile, roomId, activeFileId]);
  

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      await api.put(`/api/rooms/${roomId}/files/${activeFile._id}`, { content: activeContent });
      appendTerminal(`Saved ${activeFile.filename}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFile = async (filename, folderId = null) => {
    if (!filename) return;

    const detectedLanguage = languageByFilename(filename);

    const res = await api.post(`/api/rooms/${roomId}/files`, {
      filename,
      content: "",
      uploadedBy: user._id,
      language: detectedLanguage,
      folder: folderId
    });

    setFiles(prev => [res.data, ...prev]);
    setActiveFileId(res.data._id);
    setActiveContent("");
    setOpenTabs(prev => [res.data._id, ...prev]); // Add new file to open tabs
    setCreatingIn(null); // Clear creating state after successful creation
    appendTerminal(`Created file ${filename}`);
  };

  const handleAddFolder = async (name) => {
    if (!name) return;
    const res = await api.post(`/api/rooms/${roomId}/folders`, { name, createdBy: user._id });
    setFolders(prev => [...prev, res.data]);
    setExpandedFolders(prev => new Set([...Array.from(prev), res.data._id]));
    setCreatingIn(null); // Clear creating state after successful creation
    appendTerminal(`Created folder ${name}`);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const handleCloseTab = (fileId) => {
    // Find the file being closed and save its content
    const fileToClose = files.find(f => f._id === fileId);
    if (fileToClose && fileToClose._id === activeFileId && activeContent) {
      // Save current file content before closing
      saveCurrentFile();
    }

    setOpenTabs(prev => prev.filter(id => id !== fileId));

    // If closing the active tab, switch to another tab
    if (activeFileId === fileId) {
      const remainingTabs = openTabs.filter(id => id !== fileId);
      if (remainingTabs.length > 0) {
        // Switch to the next tab (or previous if it was the last one)
        const currentIndex = openTabs.indexOf(fileId);
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        const nextTabId = remainingTabs[nextIndex];
        const nextFile = files.find(f => f._id === nextTabId);
        if (nextFile) {
          setActiveFileId(nextTabId);
          setActiveContent(nextFile.content || "");
        }
      } else {
        // No tabs left, reset to null
        setActiveFileId(null);
        setActiveContent("");
      }
    }
  };

  const clearTerminal = () => {
    setTerminalLines([]);
  };

  const appendTerminal = (text) => {
    setTerminalLines(prev => [...prev, text]);
  };

  const handleExecute = async () => {
    if (!activeFile) return;

    const payload = {
      code: activeContent,
      language: activeFile.language || languageByFilename(activeFile.filename),
      filename: activeFile.filename
    };

    setIsTerminalOpen(true); // Open terminal when running
    clearTerminal(); // Clear terminal before execution
    appendTerminal(`Running ${activeFile.filename} (${payload.language})...`);

    try {
      const res = await api.post('/api/execute', payload);

      if (res.data.output) {
        appendTerminal(res.data.output.trim());
      }

      if (res.data.error) {
        appendTerminal(`Error: ${res.data.error.trim()}`);
      }

      if (res.data.error && res.data.error.includes('not installed')) {
        appendTerminal('\n💡 Tip: Make sure Python/Node.js/compilers are installed on the server.');
      }

      appendTerminal(`Process exited with code ${res.data.exitCode} in ${res.data.executionTime}ms`);
    } catch (error) {
      console.error('Execution failed:', error);
      appendTerminal(`❌ Execution failed: ${error.response?.data?.error || error.message}`);

      if (error.response?.data?.details) {
        appendTerminal(`Details: ${error.response.data.details}`);
      }

      appendTerminal('\n💡 This might be because:');
      appendTerminal('• Runtime tools (Python, Node.js, compilers) are not installed on the server');
      appendTerminal('• The server environment doesn\'t support code execution');
      appendTerminal('• Network connectivity issues');
    }
  };

  const toggleTerminal = () => {
    setIsTerminalOpen(prev => !prev);
  };

  const sendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !socket) return;
    socket.emit("sendMessage", { roomId, message: trimmed, sender: user });
    setChatInput("");
  };

  const handleEditMessage = (messageId, newMessage) => {
    if (!socket) return;
    socket.emit("updateMessage", { roomId, messageId, message: newMessage, userId: user._id });
  };

  const handleDeleteMessage = (messageId) => {
    if (!socket) return;
    socket.emit("deleteMessage", { roomId, messageId, userId: user._id });
  };

  const handleDeleteFile = async (file) => {
    // If deleting the active file, save its content first
    if (file._id === activeFileId && activeContent) {
      await saveCurrentFile();
    }

    await api.delete(`/api/rooms/${roomId}/files/${file._id}`);
    setFiles(prev => prev.filter(f => f._id !== file._id));
    setOpenTabs(prev => prev.filter(id => id !== file._id)); // Remove from open tabs
    if (activeFileId === file._id) {
      const remainingTabs = openTabs.filter(id => id !== file._id);
      if (remainingTabs.length > 0) {
        const nextTabId = remainingTabs[0];
        const nextFile = files.find(f => f._id === nextTabId);
        if (nextFile) {
          setActiveFileId(nextTabId);
          setActiveContent(nextFile.content || "");
        }
      } else {
        setActiveFileId(null);
        setActiveContent("");
      }
    }
    if (socket) {
      socket.emit("deleteFile", { roomId, fileId: file._id, fileName: file.filename });
    }
    appendTerminal(`Deleted file ${file.filename}`);
  };

  const handleRenameFile = async (file, newName) => {
    if (!newName || newName === file.filename) return;

    // If renaming the active file, save its content first
    if (file._id === activeFileId && activeContent) {
      await saveCurrentFile();
    }

    await api.put(`/api/rooms/${roomId}/files/${file._id}`, { filename: newName });
    setFiles(prev => prev.map(f => f._id === file._id ? { ...f, filename: newName } : f));
    if (socket) {
      socket.emit("renameFile", { roomId, fileId: file._id, oldName: file.filename, newName });
    }
    appendTerminal(`Renamed file ${file.filename} -> ${newName}`);
  };

  const handleRenameFolder = async (folder, newName) => {
    if (!newName || newName === folder.name) return;
    await api.put(`/api/rooms/${roomId}/folders/${folder._id}`, { name: newName });
    setFolders(prev => prev.map(f => f._id === folder._id ? { ...f, name: newName } : f));
    appendTerminal(`Renamed folder ${folder.name} -> ${newName}`);
  };

  const handleDeleteFolder = async (folder) => {
    await api.delete(`/api/rooms/${roomId}/folders/${folder._id}`);
    setFolders(prev => prev.filter(f => f._id !== folder._id));
    appendTerminal(`Deleted folder ${folder.name}`);
  };

  const handleContextMenu = (e, item, type = 'file') => {
    e.preventDefault();
    const { pageX, pageY } = e;
    setContextMenu({ x: pageX, y: pageY, item, type });
  };

  const updateTabContent = (fileId, content) => {
    setTabContents(prev => {
      const next = { ...prev, [fileId]: content };
      saveToStorage('tabContents', next);
      return next;
    });
  };
  const switchToFile = async (fileId) => {
    if (fileId === activeFileId) return;

    // Save current tab content
    if (activeFileId && activeContent !== undefined) {
      updateTabContent(activeFileId, activeContent);
      await saveCurrentFile();
    }

    const file = files.find(f => f._id === fileId);
    if (!file) return;

    // Load cached content first, fallback to DB fetch
    const cached = tabContents[fileId];
    if (cached !== undefined) {
      setActiveContent(cached);
    } else {
      try {
        const res = await api.get(`/api/rooms/${roomId}/files/${fileId}`);
        setActiveContent(res.data.content || "");
      } catch {
        setActiveContent(file.content || "");
      }
    }

    setActiveFileId(fileId);
    setOpenTabs(prev => prev.includes(fileId) ? prev : [...prev, fileId]);

    // Update preview/terminal
    const isHtmlFile = file.language === 'html' || /\.html$/i.test(file.filename);
    setIsPreviewOpen(isHtmlFile);
    setIsTerminalOpen(false);
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
                  handleDeleteFile(contextMenu.item);
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
        onAddFile={handleAddFile}
        onAddFolder={handleAddFolder}
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
            <EditorArea
              activeContent={activeContent}
              selectedLanguage={selectedLanguage}
              isPreviewOpen={isPreviewOpen}
              onEditorMount={(editor) => {
                editorRef.current = editor;
                setTimeout(() => editor.focus(), 100);
              }}
              onContentChange={debouncedHandleChange}
              roomId={roomId}
            />
          )}
        </div>

        {/* Terminal - separate bottom panel */}
        <Terminal isOpen={isTerminalOpen} terminalLines={terminalLines} />
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
        onDeleteMessage={handleDeleteMessage}
        currentUser={user}
      />
    </div>
  );
}
