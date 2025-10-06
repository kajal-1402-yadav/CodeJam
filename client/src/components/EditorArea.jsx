import { useRef } from "react";
import Editor from "@monaco-editor/react";

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
        <Editor
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
  );
};

export default EditorArea;
