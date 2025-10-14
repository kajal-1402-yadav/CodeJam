import { useRef, Suspense, lazy, useState, useEffect } from "react";

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
  activeFileId
}) => {
  const editorRef = useRef(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [cachedHtmlContent, setCachedHtmlContent] = useState(null);
  const [cachedHtmlFileId, setCachedHtmlFileId] = useState(null);

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

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    onEditorMount(editor);
  };

  // Function to inline external CSS/JS files from the same room
  const processHtmlContent = (htmlContent) => {
    if (!roomId || !htmlContent || !files.length) return htmlContent;

    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Find all link tags with CSS files
    const linkTags = tempDiv.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('/')) {
        // Find the CSS file in the files array
        const cssFile = files.find(f => f.filename === href || f.filename === href.split('/').pop());
        if (cssFile && cssFile.content) {
          // Replace link tag with inline style tag
          const styleTag = document.createElement('style');
          styleTag.textContent = cssFile.content;
          link.parentNode.replaceChild(styleTag, link);
        }
      }
    });

    // Find all script tags with external JS files
    const scriptTags = tempDiv.querySelectorAll('script[src]');
    scriptTags.forEach(script => {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('/')) {
        // Find the JS file in the files array
        const jsFile = files.find(f => f.filename === src || f.filename === src.split('/').pop());
        if (jsFile && jsFile.content) {
          // Replace script tag with inline script
          const inlineScript = document.createElement('script');
          inlineScript.textContent = jsFile.content;
          script.parentNode.replaceChild(inlineScript, script);
        }
      }
    });

    return tempDiv.innerHTML;
  };

  // Force editor to update language when it changes
  const editorKey = `editor-${selectedLanguage}`;

  return (
    <div className={`flex-1 min-h-0 ${isPreviewOpen ? "grid grid-cols-2" : ""}`}>
      <div className="h-full">
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
        <div className="border-l border-gray-800 h-full bg-white overflow-hidden">
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
                <body>${processHtmlContent(activeContent)}</body>
              </html>
            `}
            style={{ backgroundColor: 'white' }}
          />
        </div>
      )}
    </div>
  );
};

export default EditorArea;
