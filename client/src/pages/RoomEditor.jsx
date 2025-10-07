import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { MessageSquare, ChevronRight, ChevronLeft, Send, Edit, Trash2, Folder as FolderIcon, Plus } from "lucide-react";
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
  const navigate = useNavigate();
  const socket = useSocket();
  const { id: roomId } = useParams();

  const [openTabs, setOpenTabs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const didWelcome = useRef(false);
  const chatEndRef = useRef(null);
  const editorRef = useRef(null);
  const activeFile = useMemo(() => files.find(f => f._id === activeFileId) || null, [files, activeFileId]);
  const openTabsData = useMemo(() => openTabs.map(tabId => files.find(f => f._id === tabId)).filter(Boolean), [openTabs, files]);

  // Update file language in backend when user changes language
  useEffect(() => {
    if (!activeFile || !selectedLanguage) return;

    const updateFileLanguage = async () => {
      try {
        // Update file in backend
        await api.put(`/api/rooms/${roomId}/files/${activeFile._id}`, {
          language: selectedLanguage
        });

        // Update local file state
        setFiles(prev => prev.map(f =>
          f._id === activeFile._id ? { ...f, language: selectedLanguage } : f
        ));

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit("updateFile", {
            roomId,
            fileId: activeFile._id,
            newContent: activeContent,
            language: selectedLanguage
          });
        }
      } catch (error) {
        console.error("Failed to update file language:", error);
      }
    };

    // Only update if the language is different from current file language
    if (selectedLanguage !== (activeFile.language || languageByFilename(activeFile.filename))) {
      updateFileLanguage();
    }
  }, [selectedLanguage, activeFile, roomId, socket, activeContent]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("joinRoom", { roomId, user });
    return () => {
      socket.emit("leaveRoom", { roomId, user });
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    const load = async () => {
      try {
        // Only show loading on first mount
        if (!files.length) setIsLoading(true);
  
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
      } catch (error) {
        console.error("Failed to load room data:", error);
      } finally {
        setIsLoading(false);
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

    socket.on("chatHistory", handleHistory);
    socket.on("receiveMessage", handleReceive);
    socket.on("messageUpdated", handleUpdated);

    return () => {
      socket.off("chatHistory", handleHistory);
      socket.off("receiveMessage", handleReceive);
      socket.off("messageUpdated", handleUpdated);
    };
  }, [socket, roomId]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleChange = (value) => {
    setActiveContent(value ?? "");
    if (socket && activeFile) {
      socket.emit("updateFile", { roomId, fileId: activeFile._id, newContent: value ?? "" });
    }
  };

  // Debounced version for performance
  const debouncedHandleChange = useMemo(
    () => {
      let timeoutId;
      return (value) => {
        setActiveContent(value ?? "");
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (socket && activeFile) {
            socket.emit("updateFile", { roomId, fileId: activeFile._id, newContent: value ?? "" });
          }
        }, 300); // Debounce for 300ms
      };
    },
    [socket, activeFile, roomId]
  );

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
    const language = languageByFilename(filename);
    const res = await api.post(`/api/rooms/${roomId}/files`, {
      filename,
      content: "",
      uploadedBy: user._id,
      language,
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
    const res = await api.post('/api/execute', payload);
    if (res.data.output) appendTerminal(res.data.output.trim());
    if (res.data.error) appendTerminal(res.data.error.trim());
    appendTerminal(`Process exited with code ${res.data.exitCode} in ${res.data.executionTime}ms`);
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

  const handleDeleteFile = async (file) => {
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
        onFileSelect={(fileId, content) => {
          setActiveFileId(fileId);
          setActiveContent(content);
          // Add file to open tabs if not already there
          setOpenTabs(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
        }}
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
            onFileSelect={(fileId, content) => {
              setActiveFileId(fileId);
              setActiveContent(content);
              // Add file to open tabs if not already there
              setOpenTabs(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
            }}
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
        currentUser={user}
      />
    </div>
  );
}
