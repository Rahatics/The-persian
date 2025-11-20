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
            currentFileContent = await fileManager_1.FileManager.readFile(filePath);
        }
        // Combine all context
        return {
            query: query,
            relevantFiles: ragContext.relevantFiles,
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