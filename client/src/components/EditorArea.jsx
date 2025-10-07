import { useRef, Suspense, lazy } from "react";

// Lazy load Monaco Editor for better performance
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const EditorArea = ({
  activeContent,
  selectedLanguage,
  isPreviewOpen,
  onEditorMount,
  onContentChange
}) => {
  const editorRef = useRef(null);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    onEditorMount(editor);
  };

  return (
    <div className={`flex-1 min-h-0 ${isPreviewOpen ? "grid grid-cols-2" : ""}`}>
      <div className="h-full">
        <Suspense fallback={null}>
          <MonacoEditor
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
        <div className="border-l border-gray-800 h-full bg-[#1E1E1E]">
          <iframe
            title="preview"
            className="w-full h-full bg-[#1E1E1E]"
            srcDoc={activeContent}
            style={{ backgroundColor: '#1E1E1E' }}
          />
        </div>
      )}
    </div>
  );
};

export default EditorArea;
