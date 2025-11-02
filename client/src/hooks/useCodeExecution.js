import { useState, useCallback } from "react";
import { executeCode } from "../services/executeService";

export function useCodeExecution({ activeFile, activeContent, folders, room, language, appendTerminal: appendTerminalProp, setTerminalLines: setTerminalLinesProp }) {
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [internalTerminalLines, setInternalTerminalLines] = useState(() => []);
    const [cwd, setCwd] = useState('');

    const usingExternalTerminal = typeof appendTerminalProp === 'function' && typeof setTerminalLinesProp === 'function';

    const appendTerminal = useCallback((text) => {
        if (usingExternalTerminal) {
            appendTerminalProp(text);
        } else {
            setInternalTerminalLines(prev => [...prev, text]);
        }
    }, [usingExternalTerminal, appendTerminalProp]);

    const clearTerminal = useCallback(() => {
        if (usingExternalTerminal) {
            setTerminalLinesProp([]);
        } else {
            setInternalTerminalLines([]);
        }
    }, [usingExternalTerminal, setTerminalLinesProp]);

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

        // Debug: log execution attempts
        try {
            // eslint-disable-next-line no-console
            console.log('useCodeExecution: executing', { filename: activeFile?.filename, language: payload.language });
        } catch {}

        setIsTerminalOpen(true);
        const activeFolder = folders.find(f => String(f._id) === String(activeFile.folder));
        const pathParts = [room?.name].filter(Boolean);
        if (activeFolder && activeFolder.name) pathParts.push(activeFolder.name);
        setCwd(pathParts.join('\\'));

        clearTerminal();
        appendTerminal(`Running ${activeFile.filename} (${payload.language})...`);

        const result = await executeCode(payload);
        // Debug: log result
        try {
            // eslint-disable-next-line no-console
            console.log('useCodeExecution: result', result);
        } catch {}

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
        handleExecute, toggleTerminal,
        // expose internal terminal lines for debugging when not using external terminal
        internalTerminalLines
    };
}