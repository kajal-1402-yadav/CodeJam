import { X, File as FileIcon, Folder as FolderIcon } from "lucide-react";

const FileTabs = ({
  files,
  activeFileId,
  onFileSelect,
  onCloseFile
}) => {
  if (files.length === 0) return null;

  return (
    <div className="flex items-center bg-[#252526] border-b border-gray-800 overflow-x-auto scrollbar-hide">
      {files.map((file) => (
        <div
          key={file._id}
          className={`group flex items-center gap-2 px-3 py-2 border-r border-gray-700 cursor-pointer min-w-0 max-w-[200px] ${
            activeFileId === file._id
              ? 'bg-[#1E1E1E] text-white border-b-2 border-b-[#A78BFA]'
              : 'bg-[#2D2D30] text-gray-300 hover:bg-[#37373D] hover:text-white'
          }`}
          onClick={() => onFileSelect(file._id, file.content || "")}
        >
          <FileIcon size={14} />
          <span className="truncate text-sm font-medium">
            {file.filename}
          </span>
          {files.length >= 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file._id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
              title="Close tab"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default FileTabs;
