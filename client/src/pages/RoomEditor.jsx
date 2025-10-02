import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Editor } from "@monaco-editor/react";
import {
  FileCode2, Palette, FileJson, Globe, FileText,
  MessageSquare, Plus, Loader2, Play, Square, Eye, Code
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
  const [newFileName, setNewFileName] = useState('');

  // Code execution state
  const [executionOutput, setExecutionOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState('');

  // Preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const API_URL = 'http://localhost:4000';

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

  const handleCreateFile = async (e) => {
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
      };

      const language = languageMap[fileExtension] || 'javascript';

      const res = await api.post(`/api/rooms/${roomId}/files`, {
        filename: newFileName,
        uploadedBy: user._id,
        language: language,
        content: '' // Empty content for new files
      });

      setFiles(prev => [...prev, res.data]);
      setNewFileName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create file');
    } finally {
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

  const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop();
    const iconClass = "w-4 h-4 mr-2 text-gray-400";
    switch (ext) {
      case 'js': case 'jsx': return <FileCode2 className={iconClass} />;
      case 'css': return <Palette className={iconClass} />;
      case 'json': return <FileJson className={iconClass} />;
      case 'html': return <Globe className={iconClass} />;
      default: return <FileText className={iconClass} />;
    }
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
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
      <main className="flex-1 p-0">
        {/* VS Code-like title bar */}
        <div className="flex items-center justify-between h-11 px-4 border-b border-gray-800 bg-[#111111]">
          <div className="flex items-center gap-3 text-sm">
            <Link to="/rooms" className="text-gray-300 hover:text-white">← Rooms</Link>
            <span className="text-gray-600">|</span>
            <span className="text-gray-300">{room?.name}</span>
          </div>
          <div className="text-xs text-gray-500">Room ID: {roomId}</div>
        </div>

        <div className="flex h-[calc(100vh-2.75rem)]">
          {/* Explorer */}
          <aside className="w-56 border-r border-gray-800 bg-[#0f0f0f] hidden md:flex md:flex-col">
            <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-800">Explorer</div>
            <div className="p-2 text-sm">
              {files.map(file => (
                <button
                  key={file._id}
                  onClick={() => handleSelectFile(file)}
                  className={`block w-full text-left px-2 py-1 rounded ${activeFile?._id === file._id ? 'bg-[#1E1E1E] text-white' : 'text-gray-300 hover:bg-[#121212]'}`}
                >
                  {getFileIcon(file.filename)}
                  {file.filename}
                </button>
              ))}
            </div>
            <form onSubmit={handleCreateFile} className="p-2 border-t border-gray-800">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="New file..."
                className="w-full px-2 py-1 text-sm bg-[#1E1E1E] border border-gray-700 rounded text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#A78BFA]"
                disabled={isCreatingFile}
              />
            </form>
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
                  <div className="flex-1 flex flex-col min-h-95">
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
    </div>
  );
}


