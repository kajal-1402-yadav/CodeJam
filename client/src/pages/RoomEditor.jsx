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
import useAuthContext from "../hooks/useAuthContext";
import { useSocket } from "../context/SocketContext";
import { getFilesByRoom, getFileById, createFile, updateFile, deleteFile } from "../services/fileService";
import { getFoldersByRoom, createFolder, updateFolder, deleteFolder } from "../services/folderService";
import { getRoomById } from "../services/roomService";
import { executeCode } from "../services/executeService";

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
      // Save current file before leaving - use synchronous approach for cleanup
      if (activeFileId && activeContent) {
        // Update localStorage immediately
        try {
          localStorage.setItem(`${roomId}_lastContent_${activeFileId}`, activeContent);
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        
        // Attempt to save to server (best effort)
        updateFile(roomId, activeFileId, { content: activeContent })
          .catch(error => {
            console.error('Failed to save file before leaving room:', error);
          });
      }
      socket.emit("leaveRoom", { roomId, user });
    };
  }, [socket, roomId, user, activeFileId, activeContent]);

  useEffect(() => {
    const load = async () => {
      try {
        const [filesRes, foldersRes, roomRes] = await Promise.all([
          getFilesByRoom(roomId),
          getFoldersByRoom(roomId),
          getRoomById(roomId)
        ]);
  
        if (!filesRes.success || !foldersRes.success || !roomRes.success) {
          console.error('Failed to load room data');
          return;
        }
  
        setFiles(filesRes.data);
        setFolders(foldersRes.data);
        setRoom(roomRes.data);

        // Try to restore last active file from localStorage
        const lastActiveFileId = localStorage.getItem(`${roomId}_lastActiveFile`);
        let fileToOpen = null;
        
        if (lastActiveFileId && filesRes.data.find(f => f._id === lastActiveFileId)) {
          fileToOpen = filesRes.data.find(f => f._id === lastActiveFileId);
        } else if (filesRes.data.length > 0) {
          fileToOpen = filesRes.data[0];
        }

        if (fileToOpen) {
          // Try to restore content from localStorage first
          const savedContent = localStorage.getItem(`${roomId}_lastContent_${fileToOpen._id}`);
          
          if (savedContent !== null) {
            // Use saved content from localStorage
            setActiveFileId(fileToOpen._id);
            setActiveContent(savedContent);
            setOpenTabs([fileToOpen._id]);
            
            // Clean up the temporary save
            localStorage.removeItem(`${roomId}_lastContent_${fileToOpen._id}`);
          } else {
            // Fetch fresh content from server
            const response = await getFileById(roomId, fileToOpen._id);
            
            if (response.success) {
              const freshContent = response.data.content || "";
              setActiveFileId(fileToOpen._id);
              setActiveContent(freshContent);
              setOpenTabs([fileToOpen._id]);
            } else {
              console.error('Failed to load file content:', response.error);
              // Fallback to file object content
              setActiveFileId(fileToOpen._id);
              setActiveContent(fileToOpen.content || "");
              setOpenTabs([fileToOpen._id]);
            }
          }

          const isHtmlFile = fileToOpen.language === "html" || /\.html$/i.test(fileToOpen.filename);
          setIsPreviewOpen(isHtmlFile);
          setIsTerminalOpen(false);
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
    const handleBeforeUnload = (e) => {
      if (activeFileId && activeContent) {
        // Save to localStorage immediately (synchronous and reliable)
        try {
          localStorage.setItem(`${roomId}_lastContent_${activeFileId}`, activeContent);
          localStorage.setItem(`${roomId}_lastActiveFile`, activeFileId);
        } catch (error) {
          console.error('Failed to save to localStorage on unload:', error);
        }

        // Use sendBeacon for more reliable delivery to server
        const data = JSON.stringify({
          content: activeContent
        });

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const beaconUrl = `${apiUrl}/api/rooms/${roomId}/files/${activeFileId}`;
        
        // Try sendBeacon first
        const beaconSent = navigator.sendBeacon && navigator.sendBeacon(beaconUrl, new Blob([data], { type: 'application/json' }));
        
        if (!beaconSent) {
          // Fallback to synchronous XMLHttpRequest
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', `/api/rooms/${roomId}/files/${activeFileId}`, false);
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

  const saveCurrentFile = async () => {
    if (activeFileId && activeContent !== undefined) {
      const result = await updateFile(roomId, activeFileId, { content: activeContent });
      
      if (result.success) {
        return true; // Indicate success
      } else {
        console.error('Failed to save current file:', result.error);
        setAutoSaveStatus('error');
        return false; // Indicate failure
      }
    }
    return true; // Nothing to save
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
          setAutoSaveStatus('saving');
          const result = await updateFile(roomId, activeFile._id, { content: value });
  
          if (result.success) {
            setAutoSaveStatus('saved');
            if (socket) {
              socket.emit("updateFile", { roomId, fileId: activeFile._id, newContent: value });
            }
          } else {
            console.error('Auto-save failed:', result.error);
            setAutoSaveStatus('error');
          }
        }
      }, 500);
    };
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

  const handleAddFile = async (filename, folderId = null) => {
    if (!filename) return;

    const detectedLanguage = languageByFilename(filename);

    const result = await createFile(roomId, {
      filename,
      content: "",
      uploadedBy: user._id,
      language: detectedLanguage,
      folder: folderId
    });

    if (result.success) {
      setFiles(prev => [result.data, ...prev]);
      setActiveFileId(result.data._id);
      setActiveContent("");
      setOpenTabs(prev => [result.data._id, ...prev]); // Add new file to open tabs
      setCreatingIn(null); // Clear creating state after successful creation
      appendTerminal(`Created file ${filename}`);
    } else {
      appendTerminal(`Failed to create file ${filename}: ${result.error}`);
    }
  };

  const handleAddFolder = async (name) => {
    if (!name) return;
    
    const result = await createFolder(roomId, { name, createdBy: user._id });
    
    if (result.success) {
      setFolders(prev => [...prev, result.data]);
      setExpandedFolders(prev => new Set([...Array.from(prev), result.data._id]));
      setCreatingIn(null); // Clear creating state after successful creation
      appendTerminal(`Created folder ${name}`);
    } else {
      appendTerminal(`Failed to create folder ${name}: ${result.error}`);
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const handleCloseTab = async (fileId) => {
    // Find the file being closed and save its content
    const fileToClose = files.find(f => f._id === fileId);
    if (fileToClose && fileToClose._id === activeFileId && activeContent) {
      // Save current file content before closing and wait for completion
      updateTabContent(activeFileId, activeContent);
      await saveCurrentFile();
    }

    // Clear the cached content for this tab
    setTabContents(prev => {
      const next = { ...prev };
      delete next[fileId];
      saveToStorage('tabContents', next);
      return next;
    });

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
          // Load content from cache or file object
          const cachedContent = tabContents[nextTabId];
          setActiveFileId(nextTabId);
          setActiveContent(cachedContent !== undefined ? cachedContent : (nextFile.content || ""));
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
    if (!activeFile) {
      appendTerminal('❌ No active file to execute');
      return;
    }

    const payload = {
      code: activeContent,
      language: activeFile.language || languageByFilename(activeFile.filename),
      filename: activeFile.filename
    };

    setIsTerminalOpen(true); // Open terminal when running
    clearTerminal(); // Clear terminal before execution
    appendTerminal(`Running ${activeFile.filename} (${payload.language})...`);

    const result = await executeCode(payload);

    if (result.success) {
      if (result.data.output) {
        appendTerminal(result.data.output.trim());
      }

      if (result.data.error) {
        appendTerminal(`Error: ${result.data.error.trim()}`);
      }

      if (result.data.error && result.data.error.includes('not installed')) {
        appendTerminal('\n💡 Tip: Make sure Python/Node.js/compilers are installed on the server.');
      }

      appendTerminal(`Process exited with code ${result.data.exitCode} in ${result.data.executionTime}ms`);
    } else {
      appendTerminal(`❌ Execution failed: ${result.error}`);

      if (result.details) {
        appendTerminal(`Details: ${result.details}`);
      }

      // Provide specific error messages based on status code
      if (result.status === 429) {
        appendTerminal('❌ Rate limit exceeded. Please wait before running again.');
      } else if (result.status === 413) {
        appendTerminal('❌ Code too large to execute.');
      } else if (result.status >= 500) {
        appendTerminal('❌ Server error. Please try again later.');
      } else {
        appendTerminal('\n💡 This might be because:');
        appendTerminal('• Runtime tools (Python, Node.js, compilers) are not installed on the server');
        appendTerminal('• The server environment doesn\'t support code execution');
        appendTerminal('• Network connectivity issues');
      }
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

    const result = await deleteFile(roomId, file._id);
    
    if (result.success) {
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
    } else {
      appendTerminal(`Failed to delete file ${file.filename}: ${result.error}`);
    }
  };

  const handleRenameFile = async (file, newName) => {
    if (!newName || newName === file.filename) return;

    // If renaming the active file, save its content first
    if (file._id === activeFileId && activeContent) {
      await saveCurrentFile();
    }

    const result = await updateFile(roomId, file._id, { filename: newName });
    
    if (result.success) {
      setFiles(prev => prev.map(f => f._id === file._id ? { ...f, filename: newName } : f));
      
      if (socket) {
        socket.emit("renameFile", { roomId, fileId: file._id, oldName: file.filename, newName });
      }
      
      appendTerminal(`Renamed file ${file.filename} -> ${newName}`);
    } else {
      appendTerminal(`Failed to rename file ${file.filename}: ${result.error}`);
    }
  };

  const handleRenameFolder = async (folder, newName) => {
    if (!newName || newName === folder.name) return;
    
    const result = await updateFolder(roomId, folder._id, { name: newName });
    
    if (result.success) {
      setFolders(prev => prev.map(f => f._id === folder._id ? { ...f, name: newName } : f));
      appendTerminal(`Renamed folder ${folder.name} -> ${newName}`);
    } else {
      appendTerminal(`Failed to rename folder ${folder.name}: ${result.error}`);
    }
  };

  const handleDeleteFolder = async (folder) => {
    const result = await deleteFolder(roomId, folder._id);
    
    if (result.success) {
      setFolders(prev => prev.filter(f => f._id !== folder._id));
      appendTerminal(`Deleted folder ${folder.name}`);
    } else {
      appendTerminal(`Failed to delete folder ${folder.name}: ${result.error}`);
    }
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

    // Save current tab content and wait for completion
    if (activeFileId && activeContent !== undefined) {
      updateTabContent(activeFileId, activeContent);
      const saveSuccess = await saveCurrentFile();
      
      if (!saveSuccess) {
        console.warn('Failed to save current file before switching');
        // Continue anyway, but user has been warned via autoSaveStatus
      }
    }

    const file = files.find(f => f._id === fileId);
    if (!file) return;

    // Load cached content first, fallback to DB fetch
    const cached = tabContents[fileId];
    if (cached !== undefined) {
      setActiveContent(cached);
      setActiveFileId(fileId);
    } else {
      const result = await getFileById(roomId, fileId);
      
      if (result.success) {
        const freshContent = result.data.content || "";
        setActiveContent(freshContent);
        setActiveFileId(fileId);
        // Cache the fresh content
        updateTabContent(fileId, freshContent);
      } else {
        console.error('Failed to fetch file content:', result.error);
        setActiveContent(file.content || "");
        setActiveFileId(fileId);
      }
    }

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
