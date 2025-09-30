import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Editor } from "@monaco-editor/react";
import RoomChat from "../components/RoomChat";

const fallbackRooms = {
  sample: { id: "sample", name: "Sample Room", language: "javascript", content: "// Start coding...\nconsole.log('Hello CodeJam');\n" },
};

export default function RoomEditor() {
  const { id } = useParams();
  const room = useMemo(() => fallbackRooms[id] || fallbackRooms.sample, [id]);
  const [files, setFiles] = useState([
    { id: "index.js", name: "index.js", language: "javascript", content: "import React from 'react'\nimport { createRoot } from 'react-dom/client'\n\ncreateRoot(document.getElementById('root')).render(<h1>Hello CodeJam</h1>)\n" },
    { id: "Button.jsx", name: "Button.jsx", language: "javascript", content: "import React from 'react'\nexport default function Button({ children, onClick }) {\n  return (<button className='bg-purple-600 text-white font-bold px-4 py-2 rounded' onClick={onClick}>{children}</button>)\n}\n" },
    { id: "globals.css", name: "globals.css", language: "css", content: ":root{ --accent:#A78BFA }\nbody{ background:#0f0f0f; color:#e5e7eb; }\n" }
  ]);
  const [activeId, setActiveId] = useState(files[0].id);
  const activeFile = files.find(f => f.id === activeId) || files[0];
  const [code, setCode] = useState(activeFile.content);

  const handleChange = (val) => {
    const value = val || "";
    setCode(value);
    setFiles(prev => prev.map(f => f.id === activeId ? { ...f, content: value } : f));
  };

  return (
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
      <Sidebar />

      <main className="flex-1 p-0 ml-64">
        {/* VS Code-like title bar */}
        <div className="flex items-center justify-between h-11 px-4 border-b border-gray-800 bg-[#111111]">
          <div className="flex items-center gap-3 text-sm">
            <Link to="/rooms" className="text-gray-300 hover:text-white">← Rooms</Link>
            <span className="text-gray-600">|</span>
            <span className="text-gray-300">{room.name}</span>
          </div>
          <div className="text-xs text-gray-500">Room ID: {id}</div>
        </div>

        <div className="flex h-[calc(100vh-2.75rem)]">
          {/* Explorer */}
          <aside className="w-56 border-r border-gray-800 bg-[#0f0f0f] hidden md:flex md:flex-col">
            <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-800">Explorer</div>
            <div className="p-2 text-sm">
              <div className="text-gray-400 mb-2">components</div>
              <button onClick={() => setActiveId("Button.jsx")} className={`block w-full text-left px-2 py-1 rounded ${activeId==='Button.jsx' ? 'bg-[#1E1E1E] text-white' : 'text-gray-300 hover:bg-[#121212]'}`}>Button.jsx</button>
              <div className="text-gray-400 mt-4 mb-2">styles</div>
              <button onClick={() => setActiveId("globals.css")} className={`block w-full text-left px-2 py-1 rounded ${activeId==='globals.css' ? 'bg-[#1E1E1E] text-white' : 'text-gray-300 hover:bg-[#121212]'}`}>globals.css</button>
              <div className="text-gray-400 mt-4 mb-2">root</div>
              <button onClick={() => setActiveId("index.js")} className={`block w-full text-left px-2 py-1 rounded ${activeId==='index.js' ? 'bg-[#1E1E1E] text-white' : 'text-gray-300 hover:bg-[#121212]'}`}>index.js</button>
            </div>
          </aside>

          {/* Main column: tabs + editor + chat */}
          <section className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="flex items-center h-9 border-b border-gray-800 bg-[#0f0f0f] overflow-x-auto">
              {files.map(f => (
                <button key={f.id} onClick={() => { setActiveId(f.id); setCode(f.content); }} className={`px-3 h-full text-sm border-r border-gray-800 ${activeId===f.id ? 'bg-[#1E1E1E] text-white' : 'text-gray-400 hover:text-white'}`}>
                  {f.name}
                </button>
              ))}
            </div>

            <div className="flex flex-1 min-h-0 gap-4 p-4">
              {/* Editor */}
              <div className="flex-1 bg-[#1E1E1E]/50 border border-gray-800 rounded-xl overflow-hidden min-h-[300px]">
                <Editor
                  theme="vs-dark"
                  height="100%"
                  language={activeFile.language}
                  value={code}
                  onChange={handleChange}
                  options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on" }}
                />
              </div>

              {/* Chat */}
              <div className="w-full lg:w-96 bg-[#1E1E1E]/50 border border-gray-800 rounded-xl flex flex-col min-h-[300px]">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="text-white font-semibold">Room Chat</h3>
                </div>
                <div className="flex-1 min-h-0">
                  <RoomChat roomId={id} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


