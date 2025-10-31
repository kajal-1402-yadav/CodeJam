import { useState, useEffect, useCallback } from "react";
import { getFilesByRoom, createFile, updateFile, deleteFile } from "../services/fileService";
import { getFoldersByRoom, createFolder, updateFolder, deleteFolder } from "../services/folderService";
import { getRoomById } from "../services/roomService";
import useAuthContext from "./useAuthContext";
import { languageByFilename } from "../utils/languageByFilename";

export function useRoomData(roomId, socket, appendTerminal) {
  const { user } = useAuthContext();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [filesRes, foldersRes, roomRes] = await Promise.all([
          getFilesByRoom(roomId),
          getFoldersByRoom(roomId),
          getRoomById(roomId),
        ]);

        if (filesRes.success) setFiles(filesRes.data);
        if (foldersRes.success) {
            setFolders(foldersRes.data);
        }
        if (roomRes.success) setRoom(roomRes.data);

      } catch (error) {
        console.error("Failed to load room data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [roomId]);

  const handleAddFile = useCallback(async (filename, folderId = null) => {
    if (!filename) return null;
    const result = await createFile(roomId, {
      filename,
      content: "",
      uploadedBy: user._id,
      language: languageByFilename(filename),
      folder: folderId,
    });

    if (result.success) {
      setFiles(prev => [...prev, result.data]);
      appendTerminal(`Created file ${filename}`);
      return result.data;
    }
    appendTerminal(`Failed to create file ${filename}: ${result.error}`);
    return null;
  }, [roomId, user, appendTerminal]);

  const handleAddFolder = useCallback(async (name, parentFolderId = null) => {
    if (!name) return;
    const result = await createFolder(roomId, { name, createdBy: user._id, parent: parentFolderId });
    if (result.success) {
      setFolders(prev => [...prev, result.data]);
      appendTerminal(`Created folder ${name}`);
    } else {
      appendTerminal(`Failed to create folder ${name}: ${result.error}`);
    }
  }, [roomId, user, appendTerminal]);

  const handleRenameFile = useCallback(async (file, newName) => {
    if (!newName || newName === file.filename) return;
    const result = await updateFile(roomId, file._id, { filename: newName });
    if (result.success) {
      setFiles(prev => prev.map(f => (f._id === file._id ? { ...f, filename: newName } : f)));
      socket.emit("renameFile", { roomId, fileId: file._id, oldName: file.filename, newName });
      appendTerminal(`Renamed file ${file.filename} -> ${newName}`);
    } else {
      appendTerminal(`Failed to rename file ${file.filename}: ${result.error}`);
    }
  }, [roomId, socket, appendTerminal]);

  const handleDeleteFile = useCallback(async (fileId) => {
    const file = files.find(f => f._id === fileId);
    if (!file) return;
    const result = await deleteFile(roomId, fileId);
    if (result.success) {
      setFiles(prev => prev.filter(f => f._id !== fileId));
      socket.emit("deleteFile", { roomId, fileId, fileName: file.filename });
      appendTerminal(`Deleted file ${file.filename}`);
      return true;
    }
    appendTerminal(`Failed to delete file ${file.filename}: ${result.error}`);
    return false;
  }, [roomId, socket, files, appendTerminal]);

  const handleRenameFolder = useCallback(async (folder, newName) => {
    if (!newName || newName === folder.name) return;
    const result = await updateFolder(roomId, folder._id, { name: newName });
    if (result.success) {
      setFolders(prev => prev.map(f => (f._id === folder._id ? { ...f, name: newName } : f)));
      appendTerminal(`Renamed folder ${folder.name} -> ${newName}`);
    } else {
      appendTerminal(`Failed to rename folder ${folder.name}: ${result.error}`);
    }
  }, [roomId, appendTerminal]);

  const handleDeleteFolder = useCallback(async (folder) => {
    const result = await deleteFolder(roomId, folder._id);
    if (result.success) {
      setFolders(prev => prev.filter(f => f._id !== folder._id));
      appendTerminal(`Deleted folder ${folder.name}`);
    } else {
      appendTerminal(`Failed to delete folder ${folder.name}: ${result.error}`);
    }
  }, [roomId, appendTerminal]);

  return {
    files, setFiles, folders, setFolders, room, setRoom, loading,
    handleAddFile, handleAddFolder, handleRenameFile, handleDeleteFile,
    handleRenameFolder, handleDeleteFolder
  };
}