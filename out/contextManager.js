"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
const fs = require("fs");
const path = require("path");
const ragManager_1 = require("./ragManager");
const configManager_1 = require("./configManager");
const fileManager_1 = require("./fileManager");
class ContextManager {
    constructor() {
        this.sessionHistory = [];
        this.SESSION_FILE = '.parsian/session.json';
        this.MAX_HISTORY_ITEMS = 10;
        this.ragManager = new ragManager_1.RagManager();
        this.loadSessionHistory();
    }
    // Get context for a user query
    async getContextForQuery(query, filePath) {
        // Get RAG context
        const ragContext = this.ragManager.getContextForQuery(query);
        // Get recent session history
        const recentHistory = this.getRecentHistory();
        // Get current file context if provided
        let currentFileContent = null;
        if (filePath) {
            try {
                currentFileContent = await fileManager_1.FileManager.readFile(filePath);
            }
            catch (error) {
                console.error('Failed to read current file:', error);
            }
        }
        // Prioritize context - current file is most important, then RAG context
        const relevantFiles = { ...ragContext.relevantFiles };
        if (currentFileContent && filePath) {
            // Add current file to context but limit its size
            const currentFileTokens = this.estimateTokenCount(currentFileContent);
            if (currentFileTokens > 1000) {
                // Truncate large files to first 1000 tokens
                const truncatedContent = currentFileContent.substring(0, 4000) + '\n\n... (truncated for token limit)';
                relevantFiles[filePath] = truncatedContent;
            }
            else {
                relevantFiles[filePath] = currentFileContent;
            }
        }
        // If we have a current file, find related files to include in context
        if (filePath && currentFileContent) {
            // Get files related to the current file using RAG
            const relatedFiles = this.findRelevantFiles(`related to ${filePath}`, 5);
            // Add related files to context (limit to 2 additional files)
            let relatedFileCount = 0;
            for (const relatedFile of relatedFiles) {
                if (relatedFileCount >= 2)
                    break;
                // Skip if already included
                if (relevantFiles[relatedFile.filePath])
                    continue;
                // Skip the current file
                if (relatedFile.filePath === filePath)
                    continue;
                try {
                    const content = await fileManager_1.FileManager.readFile(relatedFile.filePath);
                    if (content) {
                        const tokenCount = this.estimateTokenCount(content);
                        // Check token limit
                        if (ragContext.totalTokens + tokenCount <= 3000) {
                            relevantFiles[relatedFile.filePath] = content;
                            ragContext.totalTokens += tokenCount;
                            relatedFileCount++;
                        }
                        else {
                            break;
                        }
                    }
                }
                catch (error) {
                    console.error('Failed to read related file:', error);
                }
            }
        }
        // Combine all context
        return {
            query: query,
            relevantFiles: relevantFiles,
            recentHistory: recentHistory,
            currentFile: currentFileContent ? { path: filePath || '', content: currentFileContent } : null,
            totalTokens: ragContext.totalTokens
        };
    }
    // Add an interaction to the session history
    addToSessionHistory(item) {
        this.sessionHistory.push({
            ...item,
            timestamp: Date.now()
        });
        // Keep only the most recent items
        if (this.sessionHistory.length > this.MAX_HISTORY_ITEMS) {
            this.sessionHistory = this.sessionHistory.slice(-this.MAX_HISTORY_ITEMS);
        }
        // Save to file
        this.saveSessionHistory();
    }
    // Get recent session history
    getRecentHistory(count = 5) {
        return this.sessionHistory.slice(-count);
    }
    // Clear session history
    clearSessionHistory() {
        this.sessionHistory = [];
        this.saveSessionHistory();
    }
    // Load session history from file
    loadSessionHistory() {
        try {
            if (fs.existsSync(this.SESSION_FILE)) {
                const data = fs.readFileSync(this.SESSION_FILE, 'utf8');
                this.sessionHistory = JSON.parse(data);
            }
        }
        catch (error) {
            console.error('Failed to load session history:', error);
        }
    }
    // Save session history to file
    saveSessionHistory() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.SESSION_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.SESSION_FILE, JSON.stringify(this.sessionHistory, null, 2));
        }
        catch (error) {
            console.error('Failed to save session history:', error);
        }
    }
    // Index a file for RAG
    indexFile(filePath) {
        this.ragManager.indexFile(filePath);
    }
    // Index all files in a directory for RAG
    indexDirectory(dirPath) {
        this.ragManager.indexDirectory(dirPath);
    }
    // Find relevant files using RAG
    findRelevantFiles(query, maxResults = 5) {
        return this.ragManager.findRelevantFiles(query, maxResults);
    }
    // Find files related to a given file based on naming conventions
    findRelatedFiles(filePath) {
        const relatedFiles = [];
        const fileName = path.basename(filePath);
        const dirName = path.dirname(filePath);
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);
        try {
            // Look for common related file patterns
            const patterns = [
                `${baseName}.test${ext}`,
                `${baseName}.spec${ext}`,
                `${baseName}.mock${ext}`,
                `${baseName}.d${ext}`,
                `${baseName}.min${ext}`,
                `${baseName}Utils${ext}`,
                `${baseName}Helper${ext}`,
                `_${baseName}${ext}`,
                `${baseName}Service${ext}`,
                `${baseName}Controller${ext}`,
                `${baseName}Model${ext}`,
                `${baseName}View${ext}`,
                `${baseName}Component${ext}`
            ];
            // Check for files in the same directory
            if (fs.existsSync(dirName)) {
                const files = fs.readdirSync(dirName);
                for (const file of files) {
                    const fullPath = path.join(dirName, file);
                    if (fullPath === filePath)
                        continue; // Skip the original file
                    // Check if file matches any pattern
                    for (const pattern of patterns) {
                        if (file === pattern) {
                            relatedFiles.push({
                                filePath: fullPath,
                                similarity: 0.8 // High similarity for related files
                            });
                            break;
                        }
                    }
                }
            }
            // Look for index files in parent directories
            let parentDir = path.dirname(dirName);
            while (parentDir !== path.dirname(parentDir)) { // Stop at root
                const indexPath = path.join(parentDir, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                    relatedFiles.push({
                        filePath: indexPath,
                        similarity: 0.6 // Medium similarity for index files
                    });
                }
                parentDir = path.dirname(parentDir);
            }
        }
        catch (error) {
            console.error('Error finding related files:', error);
        }
        return relatedFiles;
    }
    // Summarize history to save space
    summarizeHistory() {
        this.ragManager.summarizeHistory();
    }
    // Get token count for content
    estimateTokenCount(content) {
        // Simple estimation: average 4 characters per token
        return Math.ceil(content.length / 4);
    }
    // Check if context exceeds token limit
    isContextWithinLimit(context, maxTokens) {
        const limit = maxTokens || configManager_1.ConfigManager.get('rag.maxContextTokens', 3000);
        return context.totalTokens <= limit;
    }
    // Trim context to fit within token limit
    trimContextToLimit(context, maxTokens) {
        const limit = maxTokens || configManager_1.ConfigManager.get('rag.maxContextTokens', 3000);
        if (context.totalTokens <= limit) {
            return context;
        }
        // Trim relevant files content
        const trimmedFiles = {};
        let currentTokens = 0;
        for (const [filePath, content] of Object.entries(context.relevantFiles)) {
            const fileTokens = this.estimateTokenCount(content);
            if (currentTokens + fileTokens <= limit) {
                trimmedFiles[filePath] = content;
                currentTokens += fileTokens;
            }
            else {
                // Add partial content to fill remaining tokens
                const remainingTokens = limit - currentTokens;
                const charsToInclude = remainingTokens * 4; // Approximate
                trimmedFiles[filePath] = content.substring(0, charsToInclude);
                break;
            }
        }
        return {
            ...context,
            relevantFiles: trimmedFiles,
            totalTokens: currentTokens
        };
    }
    // Dispose of resources
    dispose() {
        this.sessionHistory = [];
    }
}
exports.ContextManager = ContextManager;
//# sourceMappingURL=contextManager.js.map