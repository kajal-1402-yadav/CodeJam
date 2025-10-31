import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getFileById, updateFile } from "../services/fileService";
import { languageByFilename } from "../utils/languageByFilename";

const loadFromStorage = (key, defaultValue = null) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch {
        return defaultValue;
    }
};

const saveToStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
};

export function useEditorTabs(roomId, files, setFiles) {
    const [openTabs, setOpenTabs] = useState(() => loadFromStorage(`${roomId}_openTabs`, []));
    const [activeFileId, setActiveFileId] = useState(() => loadFromStorage(`${roomId}_activeFileId`, null));
    const [activeContent, setActiveContent] = useState("");
    const [tabContents, setTabContents] = useState(() => loadFromStorage(`${roomId}_tabContents`, {}));
    const [selectedLanguage, setSelectedLanguage] = useState("plaintext");
    const saveTimeoutRef = useRef(null);

    const activeFile = useMemo(() => files.find(f => f._id === activeFileId) || null, [files, activeFileId]);
    const openTabsData = useMemo(() => openTabs.map(tabId => files.find(f => f._id === tabId)).filter(Boolean), [openTabs, files]);

    useEffect(() => {
        if (activeFile) {
            setSelectedLanguage(activeFile.language || languageByFilename(activeFile.filename));
        } else {
            setSelectedLanguage("plaintext");
        }
    }, [activeFile]);

    useEffect(() => {
        saveToStorage(`${roomId}_openTabs`, openTabs);
    }, [openTabs, roomId]);

    useEffect(() => {
        saveToStorage(`${roomId}_activeFileId`, activeFileId);
    }, [activeFileId, roomId]);

    const updateTabContent = useCallback((fileId, content) => {
        setTabContents(prev => {
            const next = { ...prev, [fileId]: content };
            saveToStorage(`${roomId}_tabContents`, next);
            return next;
        });
    }, [roomId]);

    const saveCurrentFile = useCallback(async () => {
        if (activeFileId && activeContent !== undefined) {
            const result = await updateFile(roomId, activeFileId, { content: activeContent });
            if (!result.success) {
                console.error('Failed to save current file:', result.error);
                return false;
            }
        }
        return true;
    }, [roomId, activeFileId, activeContent]);

    const switchToFile = useCallback(async (fileId) => {
        if (fileId === activeFileId) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (activeFileId) {
            updateTabContent(activeFileId, activeContent);
            await saveCurrentFile();
        }

        const file = files.find(f => f._id === fileId);
        if (!file) return;

        const cached = tabContents[fileId];
        if (cached !== undefined) {
            setActiveContent(cached);
        } else {
            const res = await getFileById(roomId, fileId);
            const newContent = res.success ? res.data.content || "" : file.content || "";
            setActiveContent(newContent);
            updateTabContent(fileId, newContent);
        }
        setActiveFileId(fileId);
        if (!openTabs.includes(fileId)) {
            setOpenTabs(prev => [...prev, fileId]);
        }
    }, [activeFileId, activeContent, files, openTabs, roomId, saveCurrentFile, tabContents, updateTabContent]);

    const handleCloseTab = useCallback(async (fileId) => {
        if (fileId === activeFileId) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            await saveCurrentFile();
        }

        setTabContents(prev => {
            const next = { ...prev };
            delete next[fileId];
            saveToStorage(`${roomId}_tabContents`, next);
            return next;
        });

        const newOpenTabs = openTabs.filter(id => id !== fileId);
        setOpenTabs(newOpenTabs);

        if (activeFileId === fileId) {
            if (newOpenTabs.length > 0) {
                switchToFile(newOpenTabs[newOpenTabs.length - 1]);
            } else {
                setActiveFileId(null);
                setActiveContent("");
            }
        }
    }, [activeFileId, openTabs, saveCurrentFile, switchToFile, roomId]);

    return {
        openTabs, setOpenTabs, activeFileId, setActiveFileId, activeContent, setActiveContent,
        tabContents, updateTabContent, selectedLanguage, setSelectedLanguage, activeFile, openTabsData,
        switchToFile, handleCloseTab, saveCurrentFile, saveTimeoutRef
    };
}