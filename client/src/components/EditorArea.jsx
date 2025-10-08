import { useRef, Suspense, lazy } from "react";

// Lazy load Monaco Editor for better performance
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const EditorArea = ({
  activeContent,
  selectedLanguage,
  isPreviewOpen,
  onEditorMount,
  onContentChange,
  roomId
}) => {
  const editorRef = useRef(null);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    onEditorMount(editor);
  };

  // Function to replace relative paths with full API URLs
  const processHtmlContent = (htmlContent) => {
    if (!roomId || !htmlContent) return htmlContent;

    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Replace relative paths in various attributes
    const replacePaths = (element, attributes) => {
      attributes.forEach(attr => {
        if (element.hasAttribute(attr)) {
          const value = element.getAttribute(attr);
          // Check if it's a relative path (doesn't start with http/https, /, or #)
          if (value && !value.startsWith('http://') && !value.startsWith('https://') &&
              !value.startsWith('/') && !value.startsWith('#') && !value.startsWith('data:')) {
            // For HTML preview, we'll handle the requests through a special mechanism
            // The browser will make requests to these URLs, and our modified backend
            // will serve the raw content with proper MIME types
            const fullUrl = `/api/rooms/${roomId}/files/${encodeURIComponent(value)}`;
            element.setAttribute(attr, fullUrl);
          }
        }
      });
    };

    // Process different types of elements that can have relative paths
    const elements = tempDiv.querySelectorAll('link[href], script[src], img[src], a[href], source[src]');

    elements.forEach(element => {
      if (element.tagName === 'LINK' && element.hasAttribute('href')) {
        replacePaths(element, ['href']);
      } else if (element.tagName === 'SCRIPT' && element.hasAttribute('src')) {
        replacePaths(element, ['src']);
      } else if (element.tagName === 'IMG' && element.hasAttribute('src')) {
        replacePaths(element, ['src']);
      } else if (element.tagName === 'A' && element.hasAttribute('href')) {
        replacePaths(element, ['href']);
      } else if (element.tagName === 'SOURCE' && element.hasAttribute('src')) {
        replacePaths(element, ['src']);
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
              smoothScrolling: false, // Disabled for performance
              mouseWheelZoom: false, // Disabled for performance
              quickSuggestions: false, // Disabled for performance
              suggestOnTriggerCharacters: false, // Disabled for performance
              acceptSuggestionOnEnter: 'off', // Disabled for performance
              tabCompletion: 'off', // Disabled for performance
              parameterHints: { enabled: false }, // Disabled for performance
              hover: { enabled: false }, // Disabled for performance
              contextmenu: false, // Disabled for performance
              links: false, // Disabled for performance
              colorDecorators: false, // Disabled for performance
              lightbulb: { enabled: false }, // Disabled for performance
              codeLens: false, // Disabled for performance
              folding: false, // Disabled for performance
              foldingHighlight: false, // Disabled for performance
              showFoldingControls: 'never', // Disabled for performance
              unfoldOnClickAfterEndOfLine: false, // Disabled for performance
              matchBrackets: 'never', // Disabled for performance
              occurrencesHighlight: false, // Disabled for performance
              selectionHighlight: false, // Disabled for performance
              renderLineHighlight: 'none', // Disabled for performance
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
