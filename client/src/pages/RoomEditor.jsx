import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  File as FileIcon,
  Folder as FolderIcon,
  Play,
  TerminalSquare,
  Monitor,
  Trash2,
  X,
  Send,
  Upload,
  Edit,
  MoreVertical
} from "lucide-react";
import ContextMenu, { ContextMenuItem } from "../components/ContextMenu";
import InlineForm from "../components/InlineForm";
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
  const { id: roomId } = useParams();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const socket = useSocket();

  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [folders, setFolders] = useState([]);
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
  const [room, setRoom] = useState(null);
  const chatEndRef = useRef(null);
  const didWelcome = useRef(false);
  const editorRef = useRef(null);

  const activeFile = useMemo(() => files.find(f => f._id === activeFileId) || null, [files, activeFileId]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("joinRoom", { roomId, user });
    return () => {
      socket.emit("leaveRoom", { roomId, user });
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    const load = async () => {
      const [filesRes, foldersRes, roomRes] = await Promise.all([
        api.get(`/api/rooms/${roomId}/files`),
        api.get(`/api/rooms/${roomId}/folders`),
        api.get(`/api/rooms/${roomId}`)
      ]);
      setFiles(filesRes.data);
      setFolders(foldersRes.data);
      setRoom(roomRes.data);
      if (filesRes.data.length) {
        setActiveFileId(filesRes.data[0]._id);
        setActiveContent(filesRes.data[0].content || "");
      }
    };
    load().catch(() => {});
  }, [roomId]);

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
      if (activeFileId === fileId) {
        const next = files.find(f => f._id !== fileId);
        setActiveFileId(next?._id || null);
        setActiveContent(next?.content || "");
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
  }, [socket, activeFileId, files]);

  // Chat socket integration
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
    appendTerminal(`Created file ${filename}`);
  };

  const handleAddFolder = async (name) => {
    if (!name) return;
    const res = await api.post(`/api/rooms/${roomId}/folders`, { name, createdBy: user._id });
    setFolders(prev => [...prev, res.data]);
    setExpandedFolders(prev => new Set([...Array.from(prev), res.data._id]));
    appendTerminal(`Created folder ${name}`);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const handleExecute = async () => {
    if (!activeFile) return;
    const payload = {
      code: activeContent,
      language: activeFile.language || languageByFilename(activeFile.filename),
      filename: activeFile.filename
    };
    setIsTerminalOpen(true);
    appendTerminal(`Running ${activeFile.filename} (${payload.language})...`);
    const res = await api.post('/api/execute', payload);
    if (res.data.output) appendTerminal(res.data.output.trim());
    if (res.data.error) appendTerminal(res.data.error.trim());
    appendTerminal(`Process exited with code ${res.data.exitCode} in ${res.data.executionTime}ms`);
  };

  const appendTerminal = (text) => {
    setTerminalLines(prev => [...prev, text]);
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
    if (activeFileId === file._id) {
      const next = files.find(f => f._id !== file._id);
      setActiveFileId(next?._id || null);
      setActiveContent(next?.content || "");
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
      <div className="w-64 flex-shrink-0 border-r border-gray-800 p-3 space-y-3 bg-[#1E1E1E]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm">
          <ChevronLeft size={16} />
          <span className="truncate max-w-[120px]">{room?.name || "Room"}</span>
        </button>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-300">Explorer</h2>
          <div className="flex items-center gap-1">
            <button onClick={handleAddFolder} className="p-1 rounded hover:bg-gray-700" title="New Folder"><FolderIcon size={16} /></button>
            <button onClick={handleAddFile} className="p-1 rounded hover:bg-gray-700" title="New File"><Plus size={16} /></button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <div className="space-y-1 h-full overflow-y-auto scrollbar-hide">
            {/* Folders */}
          {folders.map(folder => (
            <div key={folder._id}>
              <div
                className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-800 cursor-pointer group"
                onClick={() => toggleFolder(folder._id)}
                onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
              >
                <div className="flex items-center gap-2">
                  <FolderIcon size={14} />
                  {editingItem?.id === folder._id ? (
                    <InlineForm
                      defaultValue={folder.name}
                      onSubmit={(value) => {
                        handleRenameFolder(folder, value);
                        setEditingItem(null);
                      }}
                      onCancel={() => setEditingItem(null)}
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
                          await handleAddFile(name, folder._id);
                          setCreatingIn(null);
                        }}
                        onCancel={() => setCreatingIn(null)}
                      />
                    </div>
                  )}
                  {files.filter(f => String(f.folder) === String(folder._id)).map(f => (
                    <div
                      key={f._id}
                      className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                        activeFileId === f._id ? 'bg-gray-800' : 'hover:bg-gray-800/60'
                      }`}
                      onClick={() => { setActiveFileId(f._id); setActiveContent(f.content || ""); }}
                      onContextMenu={(e) => handleContextMenu(e, f, 'file')}
                    >
                      <div className="flex items-center gap-2">
                        <FileIcon size={14} />
                        {editingItem?.id === f._id ? (
                          <InlineForm
                            defaultValue={f.filename}
                            onSubmit={(value) => {
                              handleRenameFile(f, value);
                              setEditingItem(null);
                            }}
                            onCancel={() => setEditingItem(null)}
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
          
          {/* Files without folder */}
          {creatingIn?.type === 'file' && !creatingIn.id && (
            <div className="px-2 py-1">
              <InlineForm
                placeholder="File name"
                onSubmit={async (name) => {
                  await handleAddFile(name);
                  setCreatingIn(null);
                }}
                onCancel={() => setCreatingIn(null)}
              />
            </div>
          )}
          {files.filter(f => !f.folder).map(f => (
            <div
              key={f._id}
              className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                activeFileId === f._id ? 'bg-gray-800' : 'hover:bg-gray-800/60'
              }`}
              onClick={() => { setActiveFileId(f._id); setActiveContent(f.content || ""); }}
              onContextMenu={(e) => handleContextMenu(e, f, 'file')}
            >
              <div className="flex items-center gap-2">
                <FileIcon size={14} />
                {editingItem?.id === f._id ? (
                  <InlineForm
                    defaultValue={f.filename}
                    onSubmit={(value) => {
                      handleRenameFile(f, value);
                      setEditingItem(null);
                    }}
                    onCancel={() => setEditingItem(null)}
                    placeholder="File name"
                  />
                ) : (
                  <span className="text-sm truncate">{f.filename}</span>
                )}
              </div>
            </div>
          ))}
          {files.length === 0 && <div className="text-xs text-gray-500">No files yet. Create one to start.</div>}
          </div>
        </div>
      </div>

      {/* Main editor */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <div className="h-12 min-h-[3rem] border-b border-gray-800 flex items-center justify-between px-3 bg-[#1E1E1E]">
          <span className="text-sm text-gray-400">{activeFile?.filename || "No file selected"}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={!activeFile || isSaving} className="px-3 py-1 rounded bg-[#A78BFA] text-[#1E1E1E] text-sm disabled:opacity-50 flex items-center gap-2">
              <Save size={16} /> {isSaving ? "Saving..." : "Save"}
            </button>

            {/* Dynamic Run/Preview Button */}
            {activeFile && (activeFile.language === "html" || /\.html$/i.test(activeFile.filename)) ? (
              <button onClick={() => setIsPreviewOpen(v => !v)} className="px-3 py-1 rounded bg-blue-500 text-[#1E1E1E] text-sm flex items-center gap-2">
                <Monitor size={16} /> {isPreviewOpen ? "Hide Preview" : "Preview"}
              </button>
            ) : (
              <button
                onClick={() => {
                  handleExecute();
                  setIsTerminalOpen(true);
                }}
                disabled={!activeFile}
                className="px-3 py-1 rounded bg-green-500 text-[#1E1E1E] text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Play size={16} /> Run
              </button>
            )}

            <button onClick={() => setIsChatOpen(v => !v)} className="p-2 rounded hover:bg-gray-800" aria-label="Toggle Chat">
              <MessageSquare size={18} />
            </button>
          </div>
        </div>

        {/* Editor + Preview */}
        <div className={`flex-1 min-h-0 ${isPreviewOpen ? "grid grid-cols-2" : ""}`}>
          <div className="h-full">
            <Editor
              height="100%"
              theme="vs-dark"
              language={activeFile ? (activeFile.language || languageByFilename(activeFile.filename)) : "plaintext"}
              value={activeContent}
              onChange={handleChange}
              onMount={(editor) => {
                editorRef.current = editor;
                // Focus the editor after mounting
                setTimeout(() => editor.focus(), 100);
              }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                readOnly: false,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                mouseWheelZoom: true
              }}
            />
          </div>
          {isPreviewOpen && (
            <div className="border-l border-gray-800 h-full bg-white">
              <iframe title="preview" className="w-full h-full" srcDoc={activeContent} />
            </div>
          )}
        </div>

        {/* Terminal */}
        {isTerminalOpen && (
          <div className="h-44 border-t border-gray-800 bg-black text-green-400 font-mono text-xs p-2 overflow-y-auto">
            {terminalLines.length === 0 ? (
              <div className="text-gray-500">Terminal ready.</div>
            ) : terminalLines.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap">{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* Chat panel */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-[#1E1E1E]/90 border-l border-gray-800 transform transition-transform duration-300 ${isChatOpen ? "translate-x-0" : "translate-x-full"} z-20`}>
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-3 bg-[#1E1E1E]/50">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span className="text-sm font-semibold">Room Chat</span>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-1 rounded hover:bg-gray-800" aria-label="Close Chat"><X size={16} /></button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((m) => {
            const isSelf =
              m?.sender?._id === user?._id ||
              m?.sender?.email === user?.email;

            return (
              <div
                key={m._id}
                className={`flex flex-col max-w-[75%] ${
                  isSelf ? "ml-auto items-end" : "items-start"
                }`}
              >
                {/* Sender + Time */}
                <div className="text-xs text-gray-400 mb-1">
                  <span className="font-semibold text-gray-300">
                    {m?.sender?.username || m?.sender?.email || "User"}
                  </span>
                  <span className="ml-2">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {m.isEdited && (
                    <span className="ml-1 text-xs text-gray-500">
                      (edited)
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    isSelf
                      ? "bg-[#A78BFA] text-[#1E1E1E]"
                      : "bg-[#1E1E1E] border border-gray-800 text-gray-100"
                  }`}
                >
                  {m.message}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-gray-800 flex items-center gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 px-3 py-2 rounded-md bg-[#1E1E1E] border border-gray-800 outline-none text-gray-200 placeholder-gray-400"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 rounded-md bg-[#A78BFA] text-[#1E1E1E] font-medium inline-flex items-center gap-2 hover:bg-purple-500"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      {/* Chat edge toggle */}
      <button
        onClick={() => setIsChatOpen(v => !v)}
        className={`fixed top-1/2 -translate-y-1/2 right-96 p-1 rounded-l bg-[#1E1E1E]/50 border border-gray-800 transition-transform duration-300 z-20 ${isChatOpen ? "" : "translate-x-96"}`}
        aria-label="Toggle Chat"
      >
        {isChatOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
}
