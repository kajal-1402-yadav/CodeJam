import { useState, useCallback } from "react";
import { executeCode } from "../services/executeService";

export function useCodeExecution({ activeFile, activeContent, folders, room, language }) {
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [terminalLines, setTerminalLines] = useState(() => []);
    const [cwd, setCwd] = useState('');

    const appendTerminal = useCallback((text) => {
        setTerminalLines(prev => [...prev, text]);
    }, []);

    const clearTerminal = useCallback(() => {
        setTerminalLines([]);
    }, []);

    const handleExecute = useCallback(async () => {
        if (!activeFile) {
            appendTerminal('❌ No active file to execute');
            return;
        }

        const payload = {
            code: activeContent,
            language: activeFile.language || 'plaintext',
            filename: activeFile.filename
        };

        setIsTerminalOpen(true);
        const activeFolder = folders.find(f => String(f._id) === String(activeFile.folder));
        const pathParts = [room?.name].filter(Boolean);
        if (activeFolder && activeFolder.name) pathParts.push(activeFolder.name);
        setCwd(pathParts.join('\\'));

        clearTerminal();
        appendTerminal(`Running ${activeFile.filename} (${payload.language})...`);

        const result = await executeCode(payload);

        if (result.success) {
            if (result.data.output) appendTerminal(result.data.output.trim());
            if (result.data.error) appendTerminal(`Error: ${result.data.error.trim()}`);
            appendTerminal(`Process exited with code ${result.data.exitCode} in ${result.data.executionTime}ms`);
        } else {
            appendTerminal(`❌ Execution failed: ${result.error}`);
            if (result.details) appendTerminal(`Details: ${result.details}`);
        }
    }, [activeFile, activeContent, folders, room, appendTerminal, clearTerminal, setCwd]);

    const toggleTerminal = () => setIsTerminalOpen(prev => !prev);

    return {
        isTerminalOpen, setIsTerminalOpen, cwd,
        handleExecute, toggleTerminal
    };
}