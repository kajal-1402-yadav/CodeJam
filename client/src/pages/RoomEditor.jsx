import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2, Folder as FolderIcon, Plus } from "lucide-react";
import FileExplorer from "../components/FileExplorer";
import Topbar from "../components/Topbar";
import Terminal from "../components/Terminal";
import ChatPanel from "../components/ChatPanel";
import EditorArea from "../components/EditorArea";
import FileTabs from "../components/FileTabs";
import ContextMenu, { ContextMenuItem } from "../components/ContextMenu";
import CollaboratorSidebar from "../components/CollaboratorSidebar";
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
  const [isCollaboratorOpen, setIsCollaboratorOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cwd, setCwd] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(176); // ~h-44
  const isDraggingTerm = useRef(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [creatingIn, setCreatingIn] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("plaintext");
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const didWelcome = useRef(false);
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);

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

  // Join/leave room with proper cleanup
  useEffect(() => {
    if (!socket || !user) return;
    
    socket.emit("joinRoom", { roomId, user });
    
    return () => {
      // Save current file before leaving - use synchronous approach for cleanup
      const currentActiveFileId = activeFileId;
      const currentActiveContent = activeContent;
      
      if (currentActiveFileId && currentActiveContent) {
        // Update localStorage immediately
        try {
          localStorage.setItem(`${roomId}_lastContent_${currentActiveFileId}`, currentActiveContent);
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        
        // Attempt to save to server (best effort)
        updateFile(roomId, currentActiveFileId, { content: currentActiveContent })
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

        // Auto-expand root folder (folder with room name and no parent)
        const rootFolder = foldersRes.data.find(f => !f.parent && f.name === roomRes.data.name);
        if (rootFolder) {
          setExpandedFolders(prev => new Set([...Array.from(prev), rootFolder._id]));
        }

        // Restore open tabs from localStorage
        const savedOpenTabs = loadFromStorage('openTabs', []);
        const savedActiveFileId = loadFromStorage('activeFileId', null);
        const savedTabContents = loadFromStorage('tabContents', {});
        
        // Filter out tabs for files that no longer exist
        const validTabs = savedOpenTabs.filter(tabId => 
          filesRes.data.find(f => f._id === tabId)
        );
        
        // Determine which file to open
        let fileToOpen = null;
        let tabsToOpen = [];
        let activeFileIdToSet = null;
        
        if (validTabs.length > 0) {
          // Restore previously open tabs
          tabsToOpen = validTabs;
          
          // Try to restore the previously active file
          if (savedActiveFileId && validTabs.includes(savedActiveFileId)) {
            fileToOpen = filesRes.data.find(f => f._id === savedActiveFileId);
            activeFileIdToSet = savedActiveFileId;
          } else {
            // Active file was closed, use first tab
            fileToOpen = filesRes.data.find(f => f._id === validTabs[0]);
            activeFileIdToSet = validTabs[0];
          }
        } else {
          // No saved tabs, open first file if available
          if (filesRes.data.length > 0) {
            fileToOpen = filesRes.data[0];
            tabsToOpen = [fileToOpen._id];
            activeFileIdToSet = fileToOpen._id;
          }
        }

        if (fileToOpen && activeFileIdToSet) {
          // Try to restore content from localStorage first (for unsaved changes)
          const savedContent = localStorage.getItem(`${roomId}_lastContent_${activeFileIdToSet}`);
          
          if (savedContent !== null) {
            // Use saved content from localStorage (unsaved changes)
            setActiveFileId(activeFileIdToSet);
            setActiveContent(savedContent);
            setOpenTabs(tabsToOpen);
            
            // Restore cached tab contents
            if (Object.keys(savedTabContents).length > 0) {
              setTabContents(savedTabContents);
            }
            
            // Clean up the temporary save
            localStorage.removeItem(`${roomId}_lastContent_${activeFileIdToSet}`);
          } else {
            // Check if we have cached content
            const cachedContent = savedTabContents[activeFileIdToSet];
            
            if (cachedContent !== undefined) {
              // Use cached content
              setActiveFileId(activeFileIdToSet);
              setActiveContent(cachedContent);
              setOpenTabs(tabsToOpen);
              setTabContents(savedTabContents);
            } else {
              // Fetch fresh content from server
              const response = await getFileById(roomId, activeFileIdToSet);
              
              if (response.success) {
                const freshContent = response.data.content || "";
                setActiveFileId(activeFileIdToSet);
                setActiveContent(freshContent);
                setOpenTabs(tabsToOpen);
                
                // Initialize tab contents with fresh content
                const initialTabContents = { [activeFileIdToSet]: freshContent };
                setTabContents(initialTabContents);
              } else {
                console.error('Failed to load file content:', response.error);
                // Fallback to file object content
                setActiveFileId(activeFileIdToSet);
                setActiveContent(fileToOpen.content || "");
                setOpenTabs(tabsToOpen);
              }
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
  

  // Socket event handlers with proper dependencies
  const handleFileUpdated = useCallback(({ fileId, newContent, userId }) => {
    // Don't update if this update came from the current user (avoid overwriting local changes)
    if (userId === user?._id) {
      return;
    }
    
    setFiles(prev => prev.map(f => f._id === fileId ? { ...f, content: newContent } : f));
    
    // Only update active content if this file is NOT currently being edited
    setActiveFileId(currentActiveId => {
      if (currentActiveId === fileId) {
        // Check if user is actively typing (has unsaved changes)
        // If so, don't overwrite their work
        setActiveContent(currentContent => {
          // Only update if content hasn't changed locally
          return currentContent === newContent ? newContent : currentContent;
        });
      }
      return currentActiveId;
    });
  }, [user]);

  const handleFileRenamed = useCallback(({ fileId, newName }) => {
    setFiles(prev => prev.map(f => f._id === fileId ? { ...f, filename: newName } : f));
  }, []);

  const handleFileDeleted = useCallback(({ fileId }) => {
    setFiles(prev => prev.filter(f => f._id !== fileId));
    
    // Remove from open tabs
    setOpenTabs(prevTabs => {
      const newTabs = prevTabs.filter(id => id !== fileId);
      
      // If the deleted file was active, switch to another tab
      setActiveFileId(currentActiveId => {
        if (currentActiveId === fileId) {
          if (newTabs.length > 0) {
            const nextTabId = newTabs[0];
            // Get the next file's content from files state
            setFiles(currentFiles => {
              const nextFile = currentFiles.find(f => f._id === nextTabId);
              if (nextFile) {
                setActiveContent(nextFile.content || "");
              }
              return currentFiles;
            });
            return nextTabId;
          } else {
            setActiveContent("");
            return null;
          }
        }
        return currentActiveId;
      });
      
      return newTabs;
    });
  }, []);

  // Register socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("fileUpdated", handleFileUpdated);
    socket.on("fileRenamed", handleFileRenamed);
    socket.on("fileDeleted", handleFileDeleted);

    // Show participants list updates
    socket.on("roomUsers", (users) => {
      appendTerminal(`Participants: ${users.join(', ')}`);
    });

    return () => {
      socket.off("fileUpdated", handleFileUpdated);
      socket.off("fileRenamed", handleFileRenamed);
      socket.off("fileDeleted", handleFileDeleted);
      socket.off("roomUsers");
    };
  }, [socket, handleFileUpdated, handleFileRenamed, handleFileDeleted]);
    
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
      setIsPreviewOpen(false);
      // Don't auto-open terminal - let user click Run button
      setIsTerminalOpen(false);
    }
  }, [activeFile]);
  // Chat event handlers with proper dependencies
  const handleChatHistory = useCallback((history) => {
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
  }, [roomId]);

  const handleReceiveMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const handleMessageUpdated = useCallback((msg) => {
    setChatMessages((prev) =>
      prev.map((m) => (m._id === msg._id ? msg : m))
    );
  }, []);

  const handleMessageDeleted = useCallback(({ messageId }) => {
    setChatMessages((prev) =>
      prev.filter((m) => m._id !== messageId)
    );
  }, []);

  // Register chat socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("chatHistory", handleChatHistory);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("chatHistory", handleChatHistory);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, handleChatHistory, handleReceiveMessage, handleMessageUpdated, handleMessageDeleted]);

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
        const beaconUrl = `${apiUrl}/api/rooms/${roomId}/files/${currentActiveFileId}`;
        
        // Try sendBeacon first
        const beaconSent = navigator.sendBeacon && navigator.sendBeacon(beaconUrl, new Blob([data], { type: 'application/json' }));
        
        if (!beaconSent) {
          // Fallback to synchronous XMLHttpRequest
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', `/api/rooms/${roomId}/files/${currentActiveFileId}`, false);
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

  const handleAddFolder = async (name, parentFolderId = null) => {
    if (!name) return;
    
    const folderData = { 
      name, 
      createdBy: user._id
    };
    
    // Add parent folder if creating a subfolder
    if (parentFolderId) {
      folderData.parent = parentFolderId;
    }
    
    const result = await createFolder(roomId, folderData);
    
    if (result.success) {
      setFolders(prev => [...prev, result.data]);
      setExpandedFolders(prev => new Set([...Array.from(prev), result.data._id]));
      
      // Also expand parent folder if creating subfolder
      if (parentFolderId) {
        setExpandedFolders(prev => new Set([...Array.from(prev), parentFolderId]));
      }
      
      setCreatingIn(null); // Clear creating state after successful creation
      appendTerminal(`Created folder ${name}${parentFolderId ? ' (subfolder)' : ''}`);
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
    // Clear any pending auto-save timeout if closing active file
    if (fileId === activeFileId && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

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
    // Set a virtual cwd to the active file's folder (by folder name or room name)
    const activeFolder = folders.find(f => String(f._id) === String(activeFile.folder));
    const rootFolder = folders.find(f => !f.parent && f.name === room?.name);
    const pathParts = [room?.name].filter(Boolean);
    if (activeFolder && activeFolder.name) pathParts.push(activeFolder.name);
    setCwd(pathParts.join('\\'));
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
  
  // Save open tabs and active file to localStorage whenever they change
  useEffect(() => {
    if (openTabs.length > 0) {
      saveToStorage('openTabs', openTabs);
    }
  }, [openTabs, roomId]);
  
  useEffect(() => {
    if (activeFileId) {
      saveToStorage('activeFileId', activeFileId);
    }
  }, [activeFileId, roomId]);
  const switchToFile = async (fileId) => {
    if (fileId === activeFileId) return;

    // Clear any pending auto-save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

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
            onToggleCollaborators={() => setIsCollaboratorOpen(v => !v)}
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
              files={files}
              folders={folders}
              activeFileId={activeFileId}
            />
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
        onDeleteMessage={handleDeleteMessage}
        currentUser={user}
      />

      {/* Collaborator sidebar */}
      <CollaboratorSidebar
        isOpen={isCollaboratorOpen}
        onToggle={() => setIsCollaboratorOpen(v => !v)}
        currentUser={user}
        currentRoom={room}
        chatIsOpen={isChatOpen}
      />
    </div>
  );
}
