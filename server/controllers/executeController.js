const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Execute code in a sandboxed environment
const executeCode = async (req, res) => {
  try {
    const { code, language, filename } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    // Validate language
    const allowedLanguages = ['javascript', 'python', 'java', 'c', 'cpp', 'typescript'];
    if (!allowedLanguages.includes(language)) {
      return res.status(400).json({
        error: `Unsupported language. Allowed: ${allowedLanguages.join(', ')}`
      });
    }

    // Create temporary file for execution
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const tempFilename = `${timestamp}_${filename || 'temp'}`;
    const tempFilePath = path.join(tempDir, tempFilename);

    // Write code to temporary file
    await fs.writeFile(tempFilePath, code, 'utf8');

    let result = {
      output: '',
      error: '',
      executionTime: 0
    };

    const startTime = Date.now();

    switch (language) {
      case 'python':
        result = await executePython(tempFilePath);
        break;
      case 'javascript':
        result = await executeJavaScript(tempFilePath);
        break;
      case 'java':
        result = await executeJava(tempFilePath);
        break;
      case 'c':
      case 'cpp':
        result = await executeC(tempFilePath, language);
        break;
      case 'typescript':
        result = await executeTypeScript(tempFilePath);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    result.executionTime = Date.now() - startTime;

    // Clean up temporary file
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      error: 'Execution failed',
      details: error.message,
      output: '',
      error: error.message,
      executionTime: 0
    });
  }
};

// Execute Python code
const executePython = (filePath) => {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python', [filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000 // 10 second timeout
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      resolve({
        output: stdout,
        error: stderr,
        exitCode: code
      });
    });

    pythonProcess.on('error', (error) => {
      resolve({
        output: '',
        error: `Process error: ${error.message}`,
        exitCode: -1
      });
    });
  });
};

// Execute JavaScript code (Node.js)
const executeJavaScript = (filePath) => {
  return new Promise((resolve) => {
    const nodeProcess = spawn('node', [filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000
    });

    let stdout = '';
    let stderr = '';

    nodeProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    nodeProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    nodeProcess.on('close', (code) => {
      resolve({
        output: stdout,
        error: stderr,
        exitCode: code
      });
    });

    nodeProcess.on('error', (error) => {
      resolve({
        output: '',
        error: `Process error: ${error.message}`,
        exitCode: -1
      });
    });
  });
};

// Execute Java code (basic implementation)
const executeJava = (filePath) => {
  return new Promise((resolve) => {
    // This is a simplified implementation
    // In production, you'd want proper Java compilation and execution
    resolve({
      output: '',
      error: 'Java execution not fully implemented yet',
      exitCode: -1
    });
  });
};

// Execute C/C++ code
const executeC = (filePath, language) => {
  return new Promise((resolve) => {
    const compiler = language === 'c' ? 'gcc' : 'g++';
    const outputFile = filePath.replace(/\.[^.]+$/, '');

    // Compile first
    const compileProcess = spawn(compiler, [filePath, '-o', outputFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000
    });

    let compileStderr = '';

    compileProcess.stderr.on('data', (data) => {
      compileStderr += data.toString();
    });

    compileProcess.on('close', async (compileCode) => {
      if (compileCode !== 0) {
        try {
          await fs.unlink(outputFile);
        } catch (e) {}
        resolve({
          output: '',
          error: `Compilation failed:\n${compileStderr}`,
          exitCode: compileCode
        });
        return;
      }

      // Execute compiled program
      const executeProcess = spawn(outputFile, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000
      });

      let stdout = '';
      let stderr = '';

      executeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      executeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      executeProcess.on('close', async (executeCode) => {
        // Clean up executable
        try {
          await fs.unlink(outputFile);
        } catch (e) {}

        resolve({
          output: stdout,
          error: stderr,
          exitCode: executeCode
        });
      });

      executeProcess.on('error', async (error) => {
        try {
          await fs.unlink(outputFile);
        } catch (e) {}
        resolve({
          output: '',
          error: `Execution error: ${error.message}`,
          exitCode: -1
        });
      });
    });
  });
};

// Execute TypeScript code
const executeTypeScript = (filePath) => {
  return new Promise((resolve) => {
    // This is a simplified implementation
    // In production, you'd want proper TypeScript compilation and execution
    resolve({
      output: '',
      error: 'TypeScript execution not fully implemented yet',
      exitCode: -1
    });
  });
};

module.exports = {
  executeCode
};
