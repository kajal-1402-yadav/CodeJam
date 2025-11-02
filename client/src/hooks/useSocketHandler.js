import { useEffect } from "react";

export function useSocketHandler({
  socket,
  roomId,
  setFiles,
  setFolders,
  setActiveFileId,
  setActiveContent,
  setOpenTabs,
  appendTerminal,
  activeFileId,
  user,
  isExecuting
}) {

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("joinRoom", { roomId, user });

    const handleFileUpdated = ({ fileId, newContent, userId: updaterId }) => {
      if (updaterId === user._id) return;
      setFiles(prev => prev.map(f => (f._id === fileId ? { ...f, content: newContent } : f)));
      if (activeFileId === fileId) {
        // To prevent overwriting local changes, you might want more sophisticated logic here,
        // but for now, we update if the remote change is different.
        setActiveContent(prev => newContent);
      }
    };

    const handleFileRenamed = ({ fileId, newName }) => {
      setFiles(prev => prev.map(f => (f._id === fileId ? { ...f, filename: newName } : f)));
    };

    const handleFileDeleted = ({ fileId }) => {
      setFiles(prev => prev.filter(f => f._id !== fileId));
      setOpenTabs(prev => prev.filter(id => id !== fileId));
      if (activeFileId === fileId) {
        setActiveFileId(null);
        setActiveContent('');
      }
    };

    const handleFolderUpdated = ({ folderId, name }) => {
        setFolders(prev => prev.map(f => f._id === folderId ? { ...f, name } : f));
    };

    socket.on("fileUpdated", handleFileUpdated);
    socket.on("fileRenamed", handleFileRenamed);
    socket.on("fileDeleted", handleFileDeleted);
    socket.on("folderUpdated", handleFolderUpdated);
    socket.on("roomUsers", (users) => {
      // Removed collaborator presence messages from terminal to prevent spam
      // Users can see active collaborators in the UI instead
    });

    return () => {
      socket.emit("leaveRoom", { roomId, user });
      socket.off("fileUpdated", handleFileUpdated);
      socket.off("fileRenamed", handleFileRenamed);
      socket.off("fileDeleted", handleFileDeleted);
      socket.off("folderUpdated", handleFolderUpdated);
      socket.off("roomUsers");
    };
  }, [socket, roomId, user, setFiles, setFolders, setActiveFileId, setActiveContent, setOpenTabs, appendTerminal, activeFileId, isExecuting]);
}