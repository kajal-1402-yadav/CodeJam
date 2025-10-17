import { useRef, Suspense, lazy, useState, useEffect, useMemo } from "react";

// Lazy load Monaco Editor for better performance
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const EditorArea = ({
  activeContent,
  selectedLanguage,
  isPreviewOpen,
  onEditorMount,
  onContentChange,
  roomId,
  files = [],
  folders = [],
  activeFileId
}) => {
  const editorRef = useRef(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [splitPercent, setSplitPercent] = useState(50);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [cachedHtmlContent, setCachedHtmlContent] = useState(null);
  const [cachedHtmlFileId, setCachedHtmlFileId] = useState(null);

  const activeFile = useMemo(() => files.find(f => f._id === activeFileId) || null, [files, activeFileId]);

  // When files change, check if any CSS/JS files were updated that affect the current HTML preview
  useEffect(() => {
    if (isPreviewOpen && cachedHtmlFileId) {
      // Debounce preview refresh slightly to avoid too many updates
      const timer = setTimeout(() => {
        setPreviewKey(prev => prev + 1);
      }, 300); // 300ms debounce for preview updates
      
      return () => clearTimeout(timer);
    }
  }, [files, isPreviewOpen, cachedHtmlFileId]);

  // Cache the HTML content and file ID when viewing HTML
  useEffect(() => {
    if (isPreviewOpen && selectedLanguage === 'html') {
      setCachedHtmlContent(activeContent);
      setCachedHtmlFileId(activeFileId);
    }
  }, [activeContent, selectedLanguage, isPreviewOpen, activeFileId]);

  // Handle drag to resize editor/preview split
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const clamped = Math.max(20, Math.min(bounds.width - 20, x));
      const nextPercent = Math.round((clamped / bounds.width) * 100);
      setSplitPercent(nextPercent);
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    onEditorMount(editor);
  };

  // Function to rewrite external CSS/JS references by embedding content directly
const processHtmlContent = (htmlContent, files, roomId, folders, htmlFolderId) => {
  if (!roomId || !htmlContent || !files || !folders) return htmlContent;

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  const getFilename = (path) => {
    if (!path) return null;
    try {
      const url = new URL(path, 'http://local.base');
      const parts = url.pathname.split('/');
      return parts.pop() || null;
    } catch {
      const parts = String(path).split('/');
      return parts.pop() || null;
    }
  };

  // Helper to find file by filename, optionally in a specific folder
  const findFileByName = (filename, folderId = null) => {
    return files.find(file => file.filename === filename && (!folderId || String(file.folder) === String(folderId)));
  };

  // Helper to find folder by name
  const findFolderByName = (name) => {
    return folders.find(folder => folder.name === name);
  };

  // Helper to resolve relative path to folder ID
  const resolveFolderForPath = (path) => {
    const parts = path.split('/');
    if (parts.length === 1) {
      // Same folder as HTML
      return htmlFolderId;
    } else {
      // Subfolder: find folder by name
      const folderName = parts[0];
      const folder = findFolderByName(folderName);
      return folder ? folder._id : null;
    }
  };

  // Replace link[rel="stylesheet"] with embedded style
  const linkTags = tempDiv.querySelectorAll('link[rel="stylesheet"]');
  linkTags.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) return; // Skip external URLs
    const filename = getFilename(href);
    if (!filename) return;
    const folderId = resolveFolderForPath(href);
    const cssFile = findFileByName(filename, folderId);
    if (cssFile && (cssFile.language === 'css' || cssFile.filename.endsWith('.css'))) {
      // Replace link with style tag
      const styleTag = document.createElement('style');
      styleTag.textContent = cssFile.content;
      link.replaceWith(styleTag);
    }
  });

  // Replace script[src] with embedded script
  const scriptTags = tempDiv.querySelectorAll('script[src]');
  scriptTags.forEach(script => {
    const src = script.getAttribute('src');
    if (!src) return;
    const isExternal = /^https?:\/\//i.test(src);
    if (isExternal) return; // Skip external URLs
    const filename = getFilename(src);
    if (!filename) return;
    const folderId = resolveFolderForPath(src);
    const jsFile = findFileByName(filename, folderId);
    if (jsFile && (jsFile.language === 'javascript' || jsFile.filename.endsWith('.js'))) {
      // Replace script with embedded script
      const newScriptTag = document.createElement('script');
      newScriptTag.textContent = jsFile.content;
      script.replaceWith(newScriptTag);
    }
  });

  return tempDiv.innerHTML;
};

  // Force editor to update language when it changes
  const editorKey = `editor-${selectedLanguage}`;

  return (
    <div ref={containerRef} className={`flex-1 min-h-0 relative ${isPreviewOpen ? "flex" : ""}`} style={isPreviewOpen ? { } : undefined}>
      <div className="h-full" style={isPreviewOpen ? { width: `${isPreviewOpen ? splitPercent : 100}%` } : undefined}>
        <Suspense fallback={null}>
          <MonacoEditor
            key={editorKey}
            height="100%"
            theme="vs-dark"
            language={selectedLanguage}
            value={activeContent}
            onChange={onContentChange}
            onMount={handleEditorMount}
            options={{
              // Basic editor settings
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              readOnly: false,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              
              // Cursor and animation
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              
              // Essential IDE features (re-enabled for better UX)
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: true,
              
              // Helpful tooltips and hints
              parameterHints: { enabled: true },
              hover: { 
                enabled: true,
                delay: 300
              },
              
              // Bracket matching and highlighting (essential for coding)
              matchBrackets: 'always',
              bracketPairColorization: { enabled: true },
              
              // Selection and occurrence highlighting
              occurrencesHighlight: true,
              selectionHighlight: true,
              renderLineHighlight: 'all',
              
              // Code folding (useful for large files)
              folding: true,
              foldingHighlight: true,
              showFoldingControls: 'mouseover',
              
              // Other useful features
              links: true,
              colorDecorators: true,
              contextmenu: true,
              mouseWheelZoom: true,
              
              // Keep these disabled for performance
              codeLens: false,
              lightbulb: { enabled: false },
              
              // Scrollbar settings
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              }
            }}
          />
        </Suspense>
      </div>

      {isPreviewOpen && (
        <>
          {/* Left Divider (between editor and preview) */}
          <div
            className="w-1 cursor-col-resize bg-gray-800 hover:bg-gray-700"
            onMouseDown={() => {
              isDraggingRef.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
          />
          <div className="relative border-l border-gray-800 h-full bg-white overflow-hidden" style={{ width: `${100 - splitPercent}%` }}>
          <iframe
            key={previewKey}
            title="preview"
            className="w-full h-full bg-white"
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    /* Reset styles for better preview */
                    * { box-sizing: border-box; }
                    body {
                      margin: 0;
                      padding: 16px;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                      line-height: 1.6;
                      color: #333 !important;
                      background: white !important;
                      min-height: 100vh;
                    }
                    /* Override any dark backgrounds in the HTML */
                    html, body, * {
                      background: white !important;
                      color: #333 !important;
                    }
                    /* Ensure all text elements are visible */
                    h1, h2, h3, h4, h5, h6, p, div, span, a, li, td, th {
                      color: #333 !important;
                      background: transparent !important;
                    }
                    /* Style links appropriately */
                    a { color: #0066cc !important; text-decoration: underline; }
                    a:visited { color: #551a8b !important; }
                    /* Code blocks and pre elements */
                    pre, code {
                      background: #f5f5f5 !important;
                      color: #333 !important;
                      padding: 2px 4px;
                      border-radius: 3px;
                    }
                  </style>
                </head>
                <body>${processHtmlContent(activeContent, files, roomId, folders, activeFile?.folder)}</body>
              </html>
            `}
            style={{ backgroundColor: 'white' }}
          />
            {/* Right edge handle for preview */}
            <div
              className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-gray-700/40"
              onMouseDown={() => {
                isDraggingRef.current = true;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default EditorArea;
