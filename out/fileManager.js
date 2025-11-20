"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManager = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const securityManager_1 = require("./securityManager");
class FileManager {
    // Read a file safely
    static async readFile(filePath) {
        try {
            // Validate file path
            if (!securityManager_1.SecurityManager.isValidPath(filePath)) {
                throw new Error(`Invalid file path: ${filePath}`);
            }
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            // Read file content
            const content = fs.readFileSync(filePath, 'utf8');
            // Sanitize content
            return securityManager_1.SecurityManager.sanitizeFileContent(content);
        }
        catch (error) {
            console.error(`Failed to read file ${filePath}:`, error);
            return null;
        }
    }
    // Write a file safely with atomic write
    static async writeFile(filePath, content) {
        try {
            // Validate file path
            if (!securityManager_1.SecurityManager.isValidPath(filePath)) {
                throw new Error(`Invalid file path: ${filePath}`);
            }
            // Create directory if it doesn't exist
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Sanitize content
            const sanitizedContent = securityManager_1.SecurityManager.sanitizeFileContent(content);
            // Atomic write: write to temporary file first, then rename
            const tempPath = `${filePath}.tmp`;
            fs.writeFileSync(tempPath, sanitizedContent, 'utf8');
            fs.renameSync(tempPath, filePath);
            return true;
        }
        catch (error) {
            console.error(`Failed to write file ${filePath}:`, error);
            return false;
        }
    }
    // Get file information
    static async getFileInfo(filePath) {
        try {
            // Validate file path
            if (!securityManager_1.SecurityManager.isValidPath(filePath)) {
                throw new Error(`Invalid file path: ${filePath}`);
            }
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return null;
            }
            // Get file stats
            const stats = fs.statSync(filePath);
            return {
                path: filePath,
                size: stats.size,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                extension: path.extname(filePath)
            };
        }
        catch (error) {
            console.error(`Failed to get file info for ${filePath}:`, error);
            return null;
        }
    }
    // List files in a directory
    static async listDirectory(dirPath) {
        try {
            // Validate directory path
            if (!securityManager_1.SecurityManager.isValidPath(dirPath)) {
                throw new Error(`Invalid directory path: ${dirPath}`);
            }
            // Check if directory exists
            if (!fs.existsSync(dirPath)) {
                throw new Error(`Directory not found: ${dirPath}`);
            }
            // Read directory
            return fs.readdirSync(dirPath);
        }
        catch (error) {
            console.error(`Failed to list directory ${dirPath}:`, error);
            return [];
        }
    }
    // Create a directory
    static async createDirectory(dirPath) {
        try {
            // Validate directory path
            if (!securityManager_1.SecurityManager.isValidPath(dirPath)) {
                throw new Error(`Invalid directory path: ${dirPath}`);
            }
            // Create directory
            fs.mkdirSync(dirPath, { recursive: true });
            return true;
        }
        catch (error) {
            console.error(`Failed to create directory ${dirPath}:`, error);
            return false;
        }
    }
    // Delete a file or directory
    static async deletePath(targetPath) {
        try {
            // Validate path
            if (!securityManager_1.SecurityManager.isValidPath(targetPath)) {
                throw new Error(`Invalid path: ${targetPath}`);
            }
            // Check if path exists
            if (!fs.existsSync(targetPath)) {
                return true; // Already deleted
            }
            // Delete file or directory
            if (fs.statSync(targetPath).isDirectory()) {
                fs.rmdirSync(targetPath, { recursive: true });
            }
            else {
                fs.unlinkSync(targetPath);
            }
            return true;
        }
        catch (error) {
            console.error(`Failed to delete ${targetPath}:`, error);
            return false;
        }
    }
    // Copy a file or directory
    static async copyPath(sourcePath, targetPath) {
        try {
            // Validate paths
            if (!securityManager_1.SecurityManager.isValidPath(sourcePath) || !securityManager_1.SecurityManager.isValidPath(targetPath)) {
                throw new Error(`Invalid path(s): ${sourcePath}, ${targetPath}`);
            }
            // Check if source exists
            if (!fs.existsSync(sourcePath)) {
                throw new Error(`Source not found: ${sourcePath}`);
            }
            // Copy file or directory
            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, targetPath);
            }
            else {
                // Create target directory if needed
                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                fs.copyFileSync(sourcePath, targetPath);
            }
            return true;
        }
        catch (error) {
            console.error(`Failed to copy ${sourcePath} to ${targetPath}:`, error);
            return false;
        }
    }
    // Copy directory recursively
    static copyDirectory(sourceDir, targetDir) {
        // Create target directory
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        // Copy all files and subdirectories
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
            const sourcePath = path.join(sourceDir, file);
            const targetPath = path.join(targetDir, file);
            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, targetPath);
            }
            else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }
    // Get the current workspace root
    static getWorkspaceRoot() {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
        return null;
    }
    // Get relative path from workspace root
    static getRelativePath(filePath) {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return null;
        }
        try {
            return path.relative(workspaceRoot, filePath);
        }
        catch (error) {
            console.error('Failed to get relative path:', error);
            return null;
        }
    }
    // Resolve a path relative to workspace root
    static resolvePath(relativePath) {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return null;
        }
        try {
            // Validate relative path
            if (!securityManager_1.SecurityManager.isValidPath(relativePath)) {
                throw new Error(`Invalid relative path: ${relativePath}`);
            }
            return path.resolve(workspaceRoot, relativePath);
        }
        catch (error) {
            console.error('Failed to resolve path:', error);
            return null;
        }
    }
}
exports.FileManager = FileManager;
//# sourceMappingURL=fileManager.js.map