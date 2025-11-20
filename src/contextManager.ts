import * as fs from 'fs';
import * as path from 'path';
import { RagManager } from './ragManager';
import { ConfigManager } from './configManager';
import { FileManager } from './fileManager';

export class ContextManager {
    private ragManager: RagManager;
    private sessionHistory: SessionHistoryItem[] = [];
    private readonly SESSION_FILE = '.parsian/session.json';
    private readonly MAX_HISTORY_ITEMS = 10;

    constructor() {
        this.ragManager = new RagManager();
        this.loadSessionHistory();
    }

    // Get context for a user query
    async getContextForQuery(query: string, filePath?: string): Promise<ContextInfo> {
        // Get RAG context
        const ragContext = this.ragManager.getContextForQuery(query);
        
        // Get recent session history
        const recentHistory = this.getRecentHistory();
        
        // Get current file context if provided
        let currentFileContent: string | null = null;
        if (filePath) {
            currentFileContent = await FileManager.readFile(filePath);
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
    addToSessionHistory(item: SessionHistoryItem): void {
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
    getRecentHistory(count: number = 5): SessionHistoryItem[] {
        return this.sessionHistory.slice(-count);
    }

    // Clear session history
    clearSessionHistory(): void {
        this.sessionHistory = [];
        this.saveSessionHistory();
    }

    // Load session history from file
    private loadSessionHistory(): void {
        try {
            if (fs.existsSync(this.SESSION_FILE)) {
                const data = fs.readFileSync(this.SESSION_FILE, 'utf8');
                this.sessionHistory = JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load session history:', error);
        }
    }

    // Save session history to file
    private saveSessionHistory(): void {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.SESSION_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.SESSION_FILE, JSON.stringify(this.sessionHistory, null, 2));
        } catch (error) {
            console.error('Failed to save session history:', error);
        }
    }

    // Index a file for RAG
    indexFile(filePath: string): void {
        this.ragManager.indexFile(filePath);
    }

    // Index all files in a directory for RAG
    indexDirectory(dirPath: string): void {
        this.ragManager.indexDirectory(dirPath);
    }

    // Find relevant files using RAG
    findRelevantFiles(query: string, maxResults: number = 5): RelevantFile[] {
        return this.ragManager.findRelevantFiles(query, maxResults);
    }

    // Summarize history to save space
    summarizeHistory(): void {
        this.ragManager.summarizeHistory();
    }

    // Get token count for content
    estimateTokenCount(content: string): number {
        // Simple estimation: average 4 characters per token
        return Math.ceil(content.length / 4);
    }

    // Check if context exceeds token limit
    isContextWithinLimit(context: ContextInfo, maxTokens?: number): boolean {
        const limit = maxTokens || ConfigManager.get<number>('rag.maxContextTokens', 3000);
        return context.totalTokens <= limit;
    }

    // Trim context to fit within token limit
    trimContextToLimit(context: ContextInfo, maxTokens?: number): ContextInfo {
        const limit = maxTokens || ConfigManager.get<number>('rag.maxContextTokens', 3000);
        
        if (context.totalTokens <= limit) {
            return context;
        }

        // Trim relevant files content
        const trimmedFiles: { [key: string]: string } = {};
        let currentTokens = 0;
        
        for (const [filePath, content] of Object.entries(context.relevantFiles)) {
            const fileTokens = this.estimateTokenCount(content);
            
            if (currentTokens + fileTokens <= limit) {
                trimmedFiles[filePath] = content;
                currentTokens += fileTokens;
            } else {
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
    dispose(): void {
        this.sessionHistory = [];
    }
}

// Type definitions
interface ContextInfo {
    query: string;
    relevantFiles: { [key: string]: string };
    recentHistory: SessionHistoryItem[];
    currentFile: { path: string; content: string } | null;
    totalTokens: number;
}

interface SessionHistoryItem {
    type: 'user_query' | 'ai_response' | 'code_change' | 'command_execution';
    content: string;
    timestamp: number;
    metadata?: any;
}

interface RelevantFile {
    filePath: string;
    similarity: number;
}