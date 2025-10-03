import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Editor } from "@monaco-editor/react";
import {
  FileCode2, Palette, FileJson, Globe, FileText, Folder, FolderOpen, File, Upload,
  MessageSquare, Plus, Loader2, Play, Square, Eye, Code, MoreVertical, FilePlus, FolderPlus, Trash2,
  Share2, Copy, Check, ExternalLink
} from "lucide-react";
import api from "../utils/axiosConfig";
import useAuthContext from "../hooks/useAuthContext";
import RoomChat from "../components/RoomChat";

export default function RoomEditor() {
  const { user } = useAuthContext();
  const { id: roomId } = useParams();
  const navigate = useNavigate();

  // State
  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, item: null });
  const fileInputRef = useRef(null);
  
  // File system structure
  const [fileSystem, setFileSystem] = useState({ 
    name: 'root', 
    type: 'folder', 
    children: [],
    path: ''
  });
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Code execution state
  const [executionOutput, setExecutionOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState('');

  // Preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const API_URL = 'http://localhost:4000';

  // Build file system structure from flat files array
  const buildFileSystem = (files) => {
    const root = { name: 'root', type: 'folder', children: [], path: '' };
    
    files.forEach(file => {
      const pathParts = file.filename.split('/');
      let current = root;
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const isFile = i === pathParts.length - 1;
        
        if (isFile) {
          current.children.push({
            ...file,
            name: part,
            type: 'file',
            path: pathParts.slice(0, -1).join('/')
          });
        } else {
          let folder = current.children.find(child => child.name === part && child.type === 'folder');
          if (!folder) {
            folder = {
              name: part,
              type: 'folder',
              children: [],
              path: pathParts.slice(0, i + 1).join('/')
            };
            current.children.push(folder);
            // Expand all folders by default
            setExpandedFolders(prev => new Set(prev).add(folder.path));
          }
          current = folder;
        }
      }
    });
    
    return root;
  };

  // Toggle folder expanded/collapsed
  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // Handle context menu
  const handleContextMenu = (e, item = null) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        setContextMenu({ ...contextMenu, show: false });
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Handle copying room link
  const handleCopyRoomLink = (e) => {
    e?.preventDefault();
    
    // Get just the room ID (in case roomId contains the full URL)
    const roomIdOnly = roomId.split('/').pop();
    
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = roomIdOnly; // Use only the room ID
    document.body.appendChild(tempInput);
    
    // Select and copy the text
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
      // Try using the modern clipboard API first
      navigator.clipboard.writeText(roomIdOnly).then(() => {
        setCopied(true);
        setShowToast(true);
        setTimeout(() => {
          setCopied(false);
          setShowToast(false);
        }, 3000);
      }).catch(err => {
        // Fallback for when clipboard API fails
        document.execCommand('copy');
        setCopied(true);
        setShowToast(true);
        setTimeout(() => {
          setCopied(false);
          setShowToast(false);
        }, 3000);
      });
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    } finally {
      // Clean up
      document.body.removeChild(tempInput);
    }
  };

  // Handle sharing room link
  const handleShareRoom = () => {
    setShowShareModal(true);
  };

  // Handle file upload
  const handleFileUpload = async (e, folderPath = '') => {
    const files = e.target.files;
    if (!files.length) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('path', folderPath);

    try {
      const res = await api.post(`/api/rooms/${roomId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update files and file system
      setFiles(prev => [...prev, ...res.data]);
      setFileSystem(buildFileSystem([...files, ...res.data]));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload files');
    }
  };

  // Create new folder
  const handleCreateFolder = async (e, parentPath = '') => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const folderPath = parentPath ? `${parentPath}/${newFolderName}` : newFolderName;
      const res = await api.post(`/api/rooms/${roomId}/folders`, {
        path: folderPath
      });
      
      // Update file system
      setFiles(prev => [...prev, res.data]);
      setFileSystem(buildFileSystem([...files, res.data]));
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create folder');
    }
  };

  // Delete file or folder
  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return;
    
    try {
      await api.delete(`/api/rooms/${roomId}/files/${item._id}`);
      
      // Update files and file system
      const updatedFiles = files.filter(f => f._id !== item._id);
      setFiles(updatedFiles);
      setFileSystem(buildFileSystem(updatedFiles));
      
      // If the deleted file was active, clear the editor
      if (activeFile?._id === item._id) {
        setActiveFile(null);
        setFileContent('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!user?.token) {
      navigate('/login');
      return;
    }

    const fetchRoomData = async () => {
      try {
        setIsLoading(true);
        const [roomRes, filesRes, chatRes] = await Promise.all([
          api.get(`/api/rooms/${roomId}`),
          api.get(`/api/rooms/${roomId}/files`),
          api.get(`/api/rooms/${roomId}/chats`)
        ]);

        setRoom(roomRes.data);
        setFiles(filesRes.data);
        setMessages(chatRes.data);
        setFileSystem(buildFileSystem(filesRes.data));

        if (filesRes.data.length > 0) {
          handleSelectFile(filesRes.data[0]);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load room data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId, user, navigate]);

  // Check if current file supports preview
  const supportsPreview = () => {
    if (!activeFile?.filename) return false;
    const extension = activeFile.filename.split('.').pop().toLowerCase();
    return ['html', 'css'].includes(extension);
  };

  // Update preview content when file content changes
  useEffect(() => {
    if (supportsPreview() && fileContent) {
      setPreviewContent(fileContent);
    }
  }, [fileContent, activeFile]);

  // Toggle preview mode
  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // Code execution function
  const executeCode = async () => {
    if (!fileContent.trim()) {
      setExecutionError('No code to execute');
      return;
    }

    // Get file extension for language detection
    const fileExtension = activeFile?.filename?.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'mjs': 'javascript',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'ts': 'typescript',
      'tsx': 'typescript'
    };

    const language = languageMap[fileExtension] || 'javascript';

    setIsExecuting(true);
    setExecutionError('');
    setExecutionOutput('');

    try {
      const response = await api.post('/api/execute', {
        code: fileContent,
        language: language,
        filename: activeFile?.filename
      });

      const result = response.data;

      // Format the output
      let output = '';

      if (result.error) {
        output += `Error:\n${result.error}\n`;
      }

      if (result.output) {
        output += `Output:\n${result.output}`;
      }

      if (!output.trim()) {
        output = 'Code executed successfully (no output)';
      }

      // Add execution time if available
      if (result.executionTime) {
        output += `\n\nExecution time: ${result.executionTime}ms`;
      }

      setExecutionOutput(output);

    } catch (error) {
      setExecutionError(`Execution Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };
  const stopExecution = () => {
    setIsExecuting(false);
    setExecutionError('Execution stopped by user');
  };

  const handleCreateFile = async (e, folderPath = '') => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    setIsCreatingFile(true);
    try {
      // Determine language from file extension
      const fileExtension = newFileName.split('.').pop().toLowerCase();
      const languageMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'mjs': 'javascript',
        'py': 'python',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'ts': 'typescript',
        'tsx': 'typescript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown'
      };

      const language = languageMap[fileExtension] || 'plaintext';
      const filename = folderPath ? `${folderPath}/${newFileName}` : newFileName;

      const res = await api.post(`/api/rooms/${roomId}/files`, {
        filename: filename,
        uploadedBy: user._id,
        language: language,
        content: '' // Empty content for new files
      });

      // Update files and file system
      const updatedFiles = [...files, res.data];
      setFiles(updatedFiles);
      setFileSystem(buildFileSystem(updatedFiles));
      setNewFileName('');
      setIsCreatingFile(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create file');
      setIsCreatingFile(false);
    }
  };

  // Event Handlers
  const handleSelectFile = async (file) => {
    if (activeFile?._id === file._id) return;
    try {
      const res = await api.get(`/api/rooms/${roomId}/files/${file._id}`);
      setActiveFile(res.data);
      setFileContent(res.data.content);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load file');
    }
  };

  // Recursive function to render file tree
  const renderFileTree = (node, depth = 0) => {
    if (node.type === 'file') {
      return (
        <div 
          key={node._id}
          onContextMenu={(e) => handleContextMenu(e, node)}
          className={`flex items-center px-2 py-1 text-sm hover:bg-[#1E1E1E] cursor-pointer ${activeFile?._id === node._id ? 'bg-[#2A2D2E]' : ''}`}
          onClick={() => handleSelectFile(node)}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {getFileIcon(node.name, 'w-4 h-4 mr-2 text-blue-400')}
          <span className="truncate">{node.name}</span>
        </div>
      );
    }

    const isExpanded = expandedFolders.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.path || 'root'} className="">
        <div 
          className="flex items-center px-2 py-1 text-sm hover:bg-[#1E1E1E] cursor-pointer"
          onClick={() => toggleFolder(node.path)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          {isExpanded ? 
            <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" /> : 
            <Folder className="w-4 h-4 mr-2 text-yellow-400" />
          }
          <span className="truncate">{node.name}</span>
        </div>
        
        {isExpanded && (
          <div className="ml-2">
            {node.children.map(child => renderFileTree(child, depth + 1))}
            
            {/* New file/folder input in this folder */}
            {isCreatingFolder && node.path === contextMenu.item?.path && (
              <form onSubmit={(e) => {
                handleCreateFolder(e, node.path);
              }} className="px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="w-full px-1 text-xs bg-[#1E1E1E] border border-gray-700 rounded text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#A78BFA]"
                  autoFocus
                  onBlur={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                />
              </form>
            )}
            
            {isCreatingFile && node.path === contextMenu.item?.path && (
              <form onSubmit={(e) => {
                handleCreateFile(e, node.path);
              }} className="px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="File name..."
                  className="w-full px-1 text-xs bg-[#1E1E1E] border border-gray-700 rounded text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#A78BFA]"
                  autoFocus
                  onBlur={() => {
                    setIsCreatingFile(false);
                    setNewFileName('');
                  }}
                />
              </form>
            )}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (fileName = '', className = 'w-4 h-4 mr-2') => {
    const ext = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
      // Code files
      'js': <FileCode2 className={`${className} text-yellow-400`} />,
      'jsx': <FileCode2 className={`${className} text-blue-400`} />,
      'ts': <FileCode2 className={`${className} text-blue-600`} />,
      'tsx': <FileCode2 className={`${className} text-blue-500`} />,
      'py': <FileCode2 className={`${className} text-blue-300`} />,
      'java': <FileCode2 className={`${className} text-red-500`} />,
      'c': <FileCode2 className={`${className} text-blue-400`} />,
      'cpp': <FileCode2 className={`${className} text-blue-400`} />,
      'h': <FileCode2 className={`${className} text-blue-400`} />,
      'hpp': <FileCode2 className={`${className} text-blue-400`} />,
      
      // Web files
      'html': <Globe className={`${className} text-orange-500`} />,
      'css': <Palette className={`${className} text-blue-500`} />,
      'scss': <Palette className={`${className} text-pink-400`} />,
      'sass': <Palette className={`${className} text-pink-400`} />,
      'less': <Palette className={`${className} text-blue-600`} />,
      
      // Data files
      'json': <FileJson className={`${className} text-yellow-500`} />,
      'xml': <FileCode2 className={`${className} text-orange-500`} />,
      'yaml': <FileText className={`${className} text-purple-400`} />,
      'yml': <FileText className={`${className} text-purple-400`} />,
      'csv': <FileText className={`${className} text-green-500`} />,
      
      // Documents
      'md': <FileText className={`${className} text-blue-300`} />,
      'txt': <FileText className={`${className} text-gray-400`} />,
      'pdf': <FileText className={`${className} text-red-500`} />,
      'doc': <FileText className={`${className} text-blue-600`} />,
      'docx': <FileText className={`${className} text-blue-600`} />,
      'xls': <FileText className={`${className} text-green-600`} />,
      'xlsx': <FileText className={`${className} text-green-600`} />,
      'ppt': <FileText className={`${className} text-orange-500`} />,
      'pptx': <FileText className={`${className} text-orange-500`} />,
      
      // Images
      'jpg': <FileText className={`${className} text-blue-400`} />,
      'jpeg': <FileText className={`${className} text-blue-400`} />,
      'png': <FileText className={`${className} text-blue-300`} />,
      'gif': <FileText className={`${className} text-pink-400`} />,
      'svg': <FileText className={`${className} text-yellow-500`} />,
      
      // Archives
      'zip': <FileText className={`${className} text-gray-400`} />,
      'rar': <FileText className={`${className} text-gray-400`} />,
      '7z': <FileText className={`${className} text-gray-400`} />,
      'tar': <FileText className={`${className} text-gray-400`} />,
      'gz': <FileText className={`${className} text-gray-400`} />,
    };
    
    return iconMap[ext] || <FileText className={`${className} text-gray-400`} />;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1E1E1E]">
        <Loader2 className="animate-spin text-[#A78BFA]" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1E1E1E] text-red-400">
        <div className="text-center">
          <p>Error: {error}</p>
          <button onClick={() => navigate('/rooms')} className="mt-4 px-4 py-2 bg-[#A78BFA] text-[#1E1E1E] rounded">
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200" onClick={() => setContextMenu({ ...contextMenu, show: false })}>
      {/* Context Menu */}
      {contextMenu.show && (
        <div 
          className="fixed bg-[#252526] border border-gray-700 rounded shadow-lg py-1 z-50 w-48"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.item && (
            <>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-[#0E639C] text-left"
                onClick={() => {
                  setNewFileName('');
                  setIsCreatingFile(true);
                  setContextMenu({ ...contextMenu, show: false });
                }}
              >
                <FilePlus className="w-4 h-4 mr-2" /> New File
              </button>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-[#0E639C] text-left"
                onClick={() => {
                  setNewFolderName('');
                  setIsCreatingFolder(true);
                  setContextMenu({ ...contextMenu, show: false });
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
              </button>
              <div className="border-t border-gray-700 my-1"></div>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-[#0E639C] text-left"
                onClick={() => {
                  fileInputRef.current?.click();
                  setContextMenu({ ...contextMenu, show: false });
                }}
              >
                <Upload className="w-4 h-4 mr-2" /> Upload Files
              </button>
            </>
          )}
          
          {contextMenu.item?.type === 'file' && (
            <>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-[#0E639C] text-left"
                onClick={() => handleDelete(contextMenu.item)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
            </>
          )}
          
          {contextMenu.item?.type === 'folder' && (
            <>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-[#0E639C] text-left"
                onClick={(e) => {
                  setNewFileName('');
                  setIsCreatingFile(true);
                  setContextMenu({ ...contextMenu, show: false, item: contextMenu.item });
                }}
              >
                <FilePlus className="w-4 h-4 mr-2" /> New File
              </button>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-[#0E639C] text-left"
                onClick={(e) => {
                  setNewFolderName('');
                  setIsCreatingFolder(true);
                  setContextMenu({ ...contextMenu, show: false, item: contextMenu.item });
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
              </button>
              <div className="border-t border-gray-700 my-1"></div>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-[#0E639C] text-left"
                onClick={() => {
                  fileInputRef.current?.click();
                  setContextMenu({ ...contextMenu, show: false });
                }}
              >
                <Upload className="w-4 h-4 mr-2" /> Upload Files Here
              </button>
              <div className="border-t border-gray-700 my-1"></div>
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-[#0E639C] text-left"
                onClick={() => handleDelete(contextMenu.item)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
            </>
          )}
        </div>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        onChange={(e) => {
          const folderPath = contextMenu.item?.type === 'folder' ? contextMenu.item.path : '';
          handleFileUpload(e, folderPath);
        }} 
      />
      
      <main className="flex-1 p-0">
        {/* VS Code-like title bar */}
        <div className="flex items-center justify-between h-11 px-4 border-b border-gray-800 bg-[#111111]">
          <div className="flex items-center gap-3 text-sm">
            <Link to="/rooms" className="text-gray-300 hover:text-white">← Rooms</Link>
            <span className="text-gray-600">|</span>
            <span className="text-gray-300">{room?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShareRoom}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Share Room"
            >
              <Share2 size={16} />
              Share
            </button>
            <div className="text-xs text-gray-500">Room ID: {roomId}</div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-2.75rem)]">
          {/* Explorer */}
          <aside 
            className="w-64 border-r border-gray-800 bg-[#1E1E1E] hidden md:flex md:flex-col overflow-y-auto"
            onContextMenu={handleContextMenu}
          >
            <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-800">
              <span>Explorer</span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {renderFileTree(fileSystem)}
              
              {/* Root level new file/folder input */}
              {isCreatingFile && !contextMenu.item && (
                <form onSubmit={(e) => handleCreateFile(e, '')} className="px-2 py-1">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="File name..."
                    className="w-full px-1 text-xs bg-[#1E1E1E] border border-gray-700 rounded text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#A78BFA]"
                    autoFocus
                    onBlur={() => {
                      setIsCreatingFile(false);
                      setNewFileName('');
                    }}
                  />
                </form>
              )}
              
              {isCreatingFolder && !contextMenu.item && (
                <form onSubmit={(e) => handleCreateFolder(e, '')} className="px-2 py-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    className="w-full px-1 text-xs bg-[#1E1E1E] border border-gray-700 rounded text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#A78BFA]"
                    autoFocus
                    onBlur={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }}
                  />
                </form>
              )}
            </div>
            {/* File Operation Buttons at Bottom */}
            <div className="p-3 border-t border-gray-800 bg-[#1E1E1E]">
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    setNewFileName('');
                    setIsCreatingFile(true);
                    setContextMenu({ show: false, x: 0, y: 0, item: null });
                  }}
                  className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-[#A78BFA] bg-[#2A2A2A] rounded hover:bg-[#3A3A3A] transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New File
                </button>
                
                <button 
                  onClick={() => {
                    setNewFolderName('');
                    setIsCreatingFolder(true);
                    setContextMenu({ show: false, x: 0, y: 0, item: null });
                  }}
                  className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-[#A78BFA] bg-[#2A2A2A] rounded hover:bg-[#3A3A3A] transition-colors"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </button>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-[#A78BFA] bg-[#2A2A2A] rounded hover:bg-[#3A3A3A] transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </button>
              </div>
            </div>
          </aside>

          {/* Main column: tabs + editor + chat */}
          <section className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="flex items-center h-9 border-b border-gray-800 bg-[#0f0f0f] overflow-x-auto">
              {files.map(f => (
                <button
                  key={f._id}
                  onClick={() => handleSelectFile(f)}
                  className={`px-3 h-full text-sm border-r border-gray-800 ${activeFile?._id === f._id ? 'bg-[#1E1E1E] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {f.filename}
                </button>
              ))}
            </div>

            {/* Editor Toolbar */}
            <div className="flex items-center justify-between h-10 px-4 border-b border-gray-800 bg-[#0f0f0f]">
              <div className="flex items-center gap-2">
                {/* Run/Stop button for executable files */}
                {!supportsPreview() && (
                  <button
                    onClick={isExecuting ? stopExecution : executeCode}
                    disabled={!fileContent.trim()}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isExecuting
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isExecuting ? <Square size={16} /> : <Play size={16} />}
                    {isExecuting ? 'Stop' : 'Run'}
                  </button>
                )}

                {/* Preview toggle for HTML/CSS files */}
                {supportsPreview() && (
                  <button
                    onClick={togglePreviewMode}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isPreviewMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {isPreviewMode ? <Code size={16} /> : <Eye size={16} />}
                    {isPreviewMode ? 'Hide Preview' : 'Show Preview'}
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {activeFile?.filename && `Editing: ${activeFile.filename}`}
              </div>
            </div>

            <div className="flex flex-1 min-h-0">
              <div className="flex-1 flex min-h-0 relative">
                {supportsPreview() && isPreviewMode ? (
                  <>
                    {/* Code Editor Container - Resized */}
                    <div className="flex-1 flex flex-col min-h-0 pr-56">
                      <div className="flex-1 bg-[#1E1E1E]/50 border border-gray-800 rounded-xl overflow-hidden m-3">
                        <Editor
                          theme="vs-dark"
                          height="100%"
                          language={activeFile?.filename?.split('.').pop() || 'javascript'}
                          value={fileContent}
                          onChange={setFileContent}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            wordWrap: "on",
                            folding: false,
                            renderLineHighlight: "none"
                          }}
                        />
                      </div>
                    </div>

                    {/* Live Preview Overlay - Top Right */}
                    <div className="absolute top-3 right-3 w-56 h-100 bg-[#1E1E1E]/50 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between h-8 px-3 border-b border-gray-800 bg-[#0f0f0f]">
                        <span className="text-sm text-gray-300">Live Preview</span>
                        <button onClick={togglePreviewMode} className="text-xs text-gray-400 hover:text-white">
                          <Code size={12} />
                        </button>
                      </div>
                      <div className="flex-1 p-1.5 bg-white overflow-hidden">
                        {activeFile?.filename?.endsWith('.html') ? (
                          <iframe srcDoc={previewContent} className="w-full h-full border-0" title="HTML Preview" sandbox="allow-scripts allow-same-origin" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">CSS Preview</div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col min-h-45">
                    <div className="flex-1 bg-[#1E1E1E]/50 border border-gray-800 rounded-xl overflow-hidden m-3">
                      <Editor
                        theme="vs-dark"
                        height="100%"
                        language={activeFile?.filename?.split('.').pop() || 'javascript'}
                        value={fileContent}
                        onChange={setFileContent}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          wordWrap: "on",
                          folding: false,
                          renderLineHighlight: "none"
                        }}
                      />
                    </div>
                    {!supportsPreview() && (executionOutput || executionError) && (
                      <div className="m-3 bg-[#1E1E1E]/50 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between h-8 px-3 border-b border-gray-800 bg-[#0f0f0f]">
                          <span className="text-sm text-gray-300">Output</span>
                          <button onClick={() => { setExecutionOutput(''); setExecutionError(''); }} className="text-xs text-gray-400 hover:text-white">Clear</button>
                        </div>
                        <div className="p-3 max-h-40 overflow-y-auto">
                          {executionError ? (
                            <div className="text-red-400 text-sm font-mono whitespace-pre-wrap">{executionError}</div>
                          ) : (
                            <div className="text-green-400 text-sm font-mono whitespace-pre-wrap">{executionOutput}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="w-full lg:w-96 bg-[#1E1E1E]/50 border border-gray-800 rounded-xl flex flex-col min-h-[300px] m-3">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="text-white font-semibold">Room Chat</h3>
                </div>
                <div className="flex-1 min-h-0">
                  <RoomChat roomId={roomId} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Share Room Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1E1E1E] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Share Room</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-3">
                Share this room link with others so they can join your collaborative workspace.
              </p>

              <div className="flex items-center gap-2 p-3 bg-[#0f0f0f] border border-gray-700 rounded-lg">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={roomId}
                    onFocus={(e) => {
                      e.target.select();
                      e.target.setSelectionRange(0, roomId.length);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const roomIdOnly = roomId.split('/').pop();
                      const tempInput = document.createElement('input');
                      tempInput.value = roomIdOnly;
                      document.body.appendChild(tempInput);
                      tempInput.select();
                      document.execCommand('copy');
                      document.body.removeChild(tempInput);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full bg-transparent text-gray-300 text-sm focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCopyRoomLink}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-[#A78BFA] text-[#1E1E1E] hover:bg-[#A78BFA]/90'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <Check size={16} />
          Room link copied to clipboard!
        </div>
      )}
    </div>
  );
}


