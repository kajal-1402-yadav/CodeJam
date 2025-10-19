const File = require("../models/fileModel");
const mongoose = require("mongoose");


// upload a new file in a room
const uploadFile = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if this is a file upload (multipart/form-data)
    if (req.file) {
      // Handle file upload
      const { uploadedBy, folder } = req.body;

      if (!uploadedBy) {
        return res.status(400).json({ error: "uploadedBy is required" });
      }

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: "Invalid room ID" });
      }

      if (!mongoose.Types.ObjectId.isValid(uploadedBy)) {
        return res.status(400).json({ error: "Invalid uploadedBy ID" });
      }

      if (folder && !mongoose.Types.ObjectId.isValid(folder)) {
        return res.status(400).json({ error: "Invalid folder ID" });
      }

      // Get file content
      const fileContent = req.file.buffer ? req.file.buffer.toString() : '';

      // Determine language from filename
      const filename = req.file.originalname;
      const ext = filename.split('.').pop()?.toLowerCase();
      const language = getLanguageFromExtension(ext);

      const file = await File.create({
        room: roomId,
        filename,
        content: fileContent,
        uploadedBy,
        language,
        folder: folder || null
      });

      res.status(201).json(file);
    } else {
      // Handle JSON file creation (existing logic)
      const { filename, content, uploadedBy, language, folder } = req.body;

      if (!filename || !uploadedBy || !language) {
        return res.status(400).json({ error: "Filename, language and uploadedBy are required" });
      }

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: "Invalid room ID" });
      }

      if (!mongoose.Types.ObjectId.isValid(uploadedBy)) {
        return res.status(400).json({ error: "Invalid uploadedBy ID" });
      }

      // Allowed languages should mirror model enum
      const allowedLanguages = [
        "javascript",
        "typescript",
        "python",
        "java",
        "c",
        "cpp",
        "html",
        "css",
        "json",
        "markdown",
        "plaintext"
      ];
      if (!allowedLanguages.includes(language)) {
        return res.status(400).json({ error: `Invalid language. Allowed: ${allowedLanguages.join(", ")}` });
      }

      const file = await File.create({
        room: roomId,
        filename,
        content: content || "",
        uploadedBy,
        language,
        folder: folder || null
      });

      res.status(201).json(file);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Helper function to determine language from file extension
const getLanguageFromExtension = (ext) => {
  switch (ext) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'c': return 'c';
    case 'cpp': return 'cpp';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    default: return 'plaintext';
  }
};

// get all files in a room
const getFilesByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;

        const files = await File.find({
            room: roomId
        })
        .populate('uploadedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)

        res.status(200).json(files);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// get specific file content
const getFileById = async (req, res) => {
    try {
        const { roomId, fileId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: "Invalid file ID" });
        }

        const file = await File.findOne({
            _id: fileId,
            room: roomId
        }).populate('uploadedBy', 'username email');

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        // Check if this is a request for raw content (for HTML preview)
        const acceptHeader = req.headers.accept || '';
        const isRawRequest = req.headers['x-raw-content'] === 'true' ||
                           acceptHeader.includes('text/') ||
                           acceptHeader.includes('*/*');

        if (isRawRequest) {
            // Serve raw content with appropriate MIME type for HTML preview
            const contentType = getContentType(file.filename);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache');
            return res.send(file.content);
        }

        // Return file metadata as JSON for normal API usage
        res.status(200).json(file);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// get file by filename (for HTML preview with external CSS/JS)
const getFileByName = async (req, res) => {
    try {
        const { roomId, filename } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        const file = await File.findOne({
            room: roomId,
            filename: decodeURIComponent(filename)
        });

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        // Always serve raw content with appropriate MIME type for HTML preview
        const contentType = getContentType(file.filename);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for preview
        return res.send(file.content);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Helper function to determine content type based on file extension
const getContentType = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'css': return 'text/css';
        case 'js': return 'application/javascript';
        case 'json': return 'application/json';
        case 'html': return 'text/html';
        case 'xml': return 'text/xml';
        case 'txt': return 'text/plain';
        case 'md': return 'text/markdown';
        case 'py': return 'text/plain';
        case 'java': return 'text/plain';
        case 'c': return 'text/plain';
        case 'cpp': return 'text/plain';
        case 'h': return 'text/plain';
        case 'hpp': return 'text/plain';
        default: return 'text/plain';
    }
};

// Update a specific file
const updateFile = async (req, res) => {
    try {
        const { roomId, fileId } = req.params;
        const { filename, content } = req.body;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: "Invalid file ID" });
        }

        const allowedUpdates = ['filename', 'content'];
        const updateData = Object.keys(req.body)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => { obj[key] = req.body[key]; return obj; }, {});


        if (filename !== undefined) {
            updateData.filename = filename;
        }
        if (content !== undefined) {
            updateData.content = content;
        }

        const file = await File.findOneAndUpdate(
            { _id: fileId, room: roomId },
            updateData,
            { new: true, runValidators: true }
        ).populate('uploadedBy', 'name email');

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        res.status(200).json(file);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a specific file
const deleteFile = async (req, res) => {
    try {
        const { roomId, fileId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: "Invalid file ID" });
        }

        const file = await File.findOneAndDelete({ _id: fileId, room: roomId });

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};



module.exports = {
    uploadFile,
    getFilesByRoom,
    getFileById,
    getFileByName,
    updateFile,
    deleteFile
};
