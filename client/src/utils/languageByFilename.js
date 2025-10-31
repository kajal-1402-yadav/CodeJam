export const languageByFilename = (name) => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js": return "javascript";
      case "ts": return "typescript";
      case "py": return "python";
      case "java": return "java";
      case "c": return "c";
      case "cpp": return "cpp";
      case "html": return "html";
      case "css": return "css";
      case "json": return "json";
      case "md": return "markdown";
      default: return "plaintext";
    }
};