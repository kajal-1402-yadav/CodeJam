import { Save, Play, Monitor, MessageSquare, Terminal as TerminalIcon } from "lucide-react";

const AVAILABLE_LANGUAGES = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "sql", label: "SQL" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "scala", label: "Scala" },
  { value: "r", label: "R" },
  { value: "matlab", label: "MATLAB" },
  { value: "shell", label: "Shell" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
  { value: "dockerfile", label: "Dockerfile" },
];

// Utility function to determine if file has obvious extension
const hasObviousExtension = (filename) => {
  const obviousExtensions = [
    '.js', '.ts', '.py', '.java', '.c', '.cpp', '.html', '.css',
    '.json', '.md', '.sql', '.php', '.rb', '.go', '.rs', '.swift',
    '.kt', '.scala', '.r', '.m', '.sh', '.yml', '.yaml', '.xml'
  ];

  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return obviousExtensions.includes(ext);
};

// Get language label from value
const getLanguageLabel = (value) => {
  const lang = AVAILABLE_LANGUAGES.find(l => l.value === value);
  return lang ? lang.label : value;
};

const Topbar = ({
  activeFile,
  selectedLanguage,
  isSaving,
  isPreviewOpen,
  onSave,
  onRun,
  onTogglePreview,
  onToggleChat,
  onLanguageChange
}) => {
  const showLanguageSelector = activeFile && !hasObviousExtension(activeFile.filename);

  return (
    <div className="h-12 min-h-[3rem] border-b border-gray-800 flex items-center justify-between px-3 bg-[#1E1E1E]">
      <div className="flex items-center gap-3">
        {activeFile && !hasObviousExtension(activeFile.filename) && (
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="appearance-none bg-[#1E1E1E] border border-gray-600 text-gray-200 text-sm px-3 py-1 pr-8 rounded cursor-pointer focus:outline-none focus:border-[#A78BFA]"
            >
              {AVAILABLE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              ▾
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={!activeFile || isSaving}
          className="px-3 py-1 rounded bg-[#A78BFA] text-[#1E1E1E] text-sm disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={16} /> {isSaving ? "Saving..." : "Save"}
        </button>

        {/* Dynamic Run/Preview Button */}
        {activeFile && (activeFile.language === "html" || /\.html$/i.test(activeFile.filename)) ? (
          <button onClick={onTogglePreview} className="px-3 py-1 rounded bg-blue-500 text-[#1E1E1E] text-sm flex items-center gap-2">
            <Monitor size={16} /> {isPreviewOpen ? "Hide Preview" : "Preview"}
          </button>
        ) : (
          <button
            onClick={() => {
              onRun();
              // Terminal is controlled by onRun for non-HTML files
            }}
            disabled={!activeFile}
            className="px-3 py-1 rounded bg-green-500 text-[#1E1E1E] text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <Play size={16} /> Run
          </button>
        )}

        <button onClick={onToggleChat} className="p-2 rounded hover:bg-gray-800" aria-label="Toggle Chat">
          <MessageSquare size={18} />
        </button>
      </div>
    </div>
  );
};

export default Topbar;
