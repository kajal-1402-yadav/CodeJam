const Terminal = ({ isOpen, terminalLines }) => {
  if (!isOpen) return null;

  return (
    <div className="h-44 border-t border-gray-800 bg-black text-green-400 font-mono text-xs p-2 overflow-y-auto">
      {terminalLines.length === 0 ? (
        <div className="text-gray-500">Terminal ready.</div>
      ) : (
        terminalLines.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap">{line}</div>
        ))
      )}
    </div>
  );
};

export default Terminal;
