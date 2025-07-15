
import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

interface FilePreparationResponse {
  success: boolean;
  baseFilename?: string;
  language?: 'cpp' | 'python';
  compileError?: string | null;
  error?: string | null; 
}

const PROJECT_ROOT_TMP_DIR = path.resolve(process.cwd(), 'tmp');

if (!fs.existsSync(PROJECT_ROOT_TMP_DIR)) {
  try {
    fs.mkdirSync(PROJECT_ROOT_TMP_DIR, { recursive: true });
    console.log(`[File Prep API] Created tmp directory at: ${PROJECT_ROOT_TMP_DIR}`);
  } catch (e) {
    console.error(`[File Prep API] Fatal: Could not create tmp directory at ${PROJECT_ROOT_TMP_DIR}`, e);
  }
}

const sanitizeFilenamePart = (namePart: string | undefined): string => {
  if (!namePart || typeof namePart !== 'string') {
    return 'unknown_part';
  }
  return namePart
    .replace(/\.(cpp|py|html|js|jsx|tsx)$/i, "") 
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
};

const cleanupOldFiles = (directory: string, usernamePrefix: string) => {
    console.log(`[File Prep API] Cleaning up old files matching username prefix: ${usernamePrefix}_* in dir: ${directory}`);
    try {
        const files = fs.readdirSync(directory);
        files.forEach(file => {
            if (file.startsWith(usernamePrefix + '_')) { // Match username_anything.*
                const filePath = path.join(directory, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`[File Prep API] Deleted old file: ${filePath}`);
                } catch (err: any) {
                    console.warn(`[File Prep API] Failed to delete old file ${filePath}: ${err.message}`);
                }
            }
        });
    } catch (err: any) {
        console.error(`[File Prep API] Error reading directory ${directory} for cleanup: ${err.message}`);
    }
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FilePreparationResponse>
) {
  if (req.method === 'POST') {
    const prepId = Math.random().toString(36).substring(2, 10);
    console.log(`[File Prep API ID: ${prepId}] Received POST for file preparation.`);
    
    let code: string;
    let language: 'cpp' | 'python';
    let requestUsername: string;
    let requestSnippetName: string;

    if (req.body && typeof req.body.code === 'string' && 
        (req.body.language === 'cpp' || req.body.language === 'python') &&
        typeof req.body.username === 'string' &&
        typeof req.body.snippetName === 'string') {
      code = req.body.code;
      language = req.body.language;
      requestUsername = req.body.username;
      requestSnippetName = req.body.snippetName;
      
      console.log(`[File Prep API ID: ${prepId}] Inputs - Lang: ${language}, User: ${requestUsername}, Snippet: ${requestSnippetName}`);
    } else {
      const missingFields = ['code', 'language', 'username', 'snippetName'].filter(field => !(req.body && typeof req.body[field] !== 'undefined'));
      const errorMsg = `Invalid payload. Required fields: 'code', 'language', 'username', 'snippetName'. Missing/invalid: ${missingFields.join(', ')}`;
      console.error(`[File Prep API ID: ${prepId}] ${errorMsg}. Body:`, req.body);
      return res.status(400).json({ success: false, error: errorMsg });
    }

    if (language !== 'cpp' && language !== 'python') {
      return res.status(400).json({
        success: false,
        error: `Execution for language '${language}' is not supported.`,
        compileError: `Execution for language '${language}' is not supported.`,
      });
    }

    const sanitizedUsername = sanitizeFilenamePart(requestUsername);
    const sanitizedSnippetName = sanitizeFilenamePart(requestSnippetName);
    const baseFilename = `${sanitizedUsername}_${sanitizedSnippetName}`; // e.g., user1_myprogram
    
    let sourceFilePath: string = '';
    let executablePath: string = '';

    try {
      // Cleanup old files for this user
      cleanupOldFiles(PROJECT_ROOT_TMP_DIR, sanitizedUsername);

      sourceFilePath = path.join(PROJECT_ROOT_TMP_DIR, `${baseFilename}.${language === 'cpp' ? 'cpp' : 'py'}`);
      if (language === 'cpp') {
        executablePath = path.join(PROJECT_ROOT_TMP_DIR, `${baseFilename}.out`);
      }
      console.log(`[File Prep API ID: ${prepId}] Source file will be at: ${sourceFilePath}`);
      if (language === 'cpp') console.log(`[File Prep API ID: ${prepId}] Executable will be at (if C++): ${executablePath}`);

      console.log(`[File Prep API ID: ${prepId}] Attempting to write code to ${sourceFilePath}`);
      fs.writeFileSync(sourceFilePath, code);
      console.log(`[File Prep API ID: ${prepId}] Code successfully written to ${sourceFilePath}`);
      
      // Double check existence after write
      if (!fs.existsSync(sourceFilePath)) {
          const criticalError = `CRITICAL: File ${sourceFilePath} not found immediately after write operation. Check disk space or permissions.`;
          console.error(`[File Prep API ID: ${prepId}] ${criticalError}`);
          return res.status(500).json({ success: false, error: criticalError });
      }


      if (language === 'cpp') {
        const compileCommand = `g++ -std=c++17 "${sourceFilePath}" -o "${executablePath}"`;
        console.log(`[File Prep API ID: ${prepId}] Compiling C++ with: ${compileCommand}`);
        
        try {
          const { stdout: compileStdout, stderr: compileStderr } = await execPromise(compileCommand);
          if (compileStderr) {
            console.warn(`[File Prep API ID: ${prepId}] C++ Compilation stderr:`, compileStderr);
             // Even if there's stderr, g++ might still produce an executable if they are just warnings.
             // We check for existence AND if stderr indicates a fatal error.
             if (!fs.existsSync(executablePath) || compileStderr.toLowerCase().includes("error:") || compileStderr.toLowerCase().includes("fatal error:")) {
                 console.error(`[File Prep API ID: ${prepId}] Fatal C++ Compilation error. Stderr: ${compileStderr}`);
                 return res.status(200).json({ success: false, compileError: `Compilation failed (g++ stderr):\n${compileStderr}`, language });
            }
          }
          console.log(`[File Prep API ID: ${prepId}] C++ Compilation stdout:`, compileStdout);
          
          if (!fs.existsSync(executablePath)) {
             // This case implies g++ exited 0 but no file was made - highly unusual.
             const criticalError = `Compilation successful (g++ exit 0), but executable not found at ${executablePath}. This is unexpected.`;
             console.error(`[File Prep API ID: ${prepId}] ${criticalError}`);
             return res.status(200).json({ success: false, compileError: criticalError, language });
          }
          console.log(`[File Prep API ID: ${prepId}] C++ Compilation successful. Executable at: ${executablePath}`);
          fs.chmodSync(executablePath, 0o755); // Ensure executable permissions
          return res.status(200).json({ success: true, baseFilename, language });

        } catch (compileErrorCatched: any) {
          // This catch block is for errors during the execPromise itself (e.g., g++ not found)
          console.error(`[File Prep API ID: ${prepId}] C++ Compilation execPromise error:`, compileErrorCatched);
          const compileErrorMsg = compileErrorCatched.stderr || compileErrorCatched.stdout || compileErrorCatched.message || "Unknown C++ compilation error during exec.";
          return res.status(200).json({ success: false, compileError: compileErrorMsg, language });
        }
      } else if (language === 'python') {
        // For Python, the source file is the "executable" in terms of what the WebSocket server needs to run.
        console.log(`[File Prep API ID: ${prepId}] Python file prepared at ${sourceFilePath}`);
        return res.status(200).json({ success: true, baseFilename, language });
      }
    } catch (error: any) {
      console.error(`[File Prep API ID: ${prepId}] Overall error in file preparation:`, error);
      return res.status(500).json({ success: false, error: "Server error during file preparation: " + error.message });
    }
  } else {
    console.log(`[File Prep API] Received ${req.method} request, only POST allowed.`);
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }
}
