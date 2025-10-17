const Terminal = ({ isOpen, terminalLines, cwd, height }) => {
  if (!isOpen) return null;

  return (
    <div className="border-t border-gray-800 bg-black text-green-400 font-mono text-xs p-2 overflow-y-auto" style={{ height }}>
      <div className="text-gray-400 mb-1">{cwd ? `PS ${cwd}>` : 'Terminal ready.'}</div>
      {terminalLines.length === 0 ? (
        <div className="text-gray-500">Waiting for output...</div>
      ) : (
        terminalLines.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap">{line}</div>
        ))
      )}
    </div>
  );
};

export default Terminal;
