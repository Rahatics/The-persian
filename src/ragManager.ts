import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export class RagManager {
    private vectorIndex: Map<string, VectorEntry> = new Map();
    private sessionHistory: any[] = [];
    private readonly INDEX_FILE = '.parsian/index.json';
    private readonly SESSION_FILE = '.parsian/session.json';
    private readonly IGNORE_PATTERNS: RegExp[] = [
        /\.git/,
        /node_modules/,
        /dist/,
        /build/,
        /\.vscode/,
        /\.DS_Store/,
        /Thumbs\.db/
    ];

    constructor() {
        this.loadIndex();
        this.loadSessionHistory();
    }

    // Load existing vector index from file
    private loadIndex(): void {
        try {
            if (fs.existsSync(this.INDEX_FILE)) {
                const data = fs.readFileSync(this.INDEX_FILE, 'utf8');
                const parsed = JSON.parse(data);
                this.vectorIndex = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error('Failed to load vector index:', error);
        }
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

    // Save vector index to file
    private saveIndex(): void {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.INDEX_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Save index
            const obj = Object.fromEntries(this.vectorIndex);
            fs.writeFileSync(this.INDEX_FILE, JSON.stringify(obj, null, 2));
        } catch (error) {
            console.error('Failed to save vector index:', error);
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

            // Keep only the last 10 actions
            const recentHistory = this.sessionHistory.slice(-10);
            fs.writeFileSync(this.SESSION_FILE, JSON.stringify(recentHistory, null, 2));
        } catch (error) {
            console.error('Failed to save session history:', error);
        }
    }

    // Check if a file should be ignored
    private shouldIgnore(filePath: string): boolean {
        return this.IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
    }

    // Generate a hash for a file content
    private generateHash(content: string): string {
        return createHash('sha256').update(content).digest('hex');
    }

    // Estimate token count for content
    private estimateTokenCount(content: string): number {
        // Simple estimation: average 4 characters per token
        return Math.ceil(content.length / 4);
    }

    // Index a file
    public indexFile(filePath: string): void {
        // Check if file should be ignored
        if (this.shouldIgnore(filePath)) {
            return;
        }

        try {
            // Read file content
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Generate hash
            const hash = this.generateHash(content);
            
            // Check if file has changed
            const existingEntry = this.vectorIndex.get(filePath);
            if (existingEntry && existingEntry.hash === hash) {
                // No changes, update timestamp
                existingEntry.lastIndexed = Date.now();
                return;
            }
            
            // Create new entry
            const entry: VectorEntry = {
                filePath,
                hash,
                tokenCount: this.estimateTokenCount(content),
                lastIndexed: Date.now(),
                // In a real implementation, we would generate actual vectors here
                vector: this.generateDummyVector(content)
            };
            
            // Add to index
            this.vectorIndex.set(filePath, entry);
            
            // Save index
            this.saveIndex();
        } catch (error) {
            console.error(`Failed to index file ${filePath}:`, error);
        }
    }

    // Index all files in a directory
    public indexDirectory(dirPath: string): void {
        try {
            const files = this.getAllFiles(dirPath);
            files.forEach(file => this.indexFile(file));
        } catch (error) {
            console.error(`Failed to index directory ${dirPath}:`, error);
        }
    }

    // Get all files in a directory (recursive)
    private getAllFiles(dirPath: string): string[] {
        let results: string[] = [];
        
        try {
            const list = fs.readdirSync(dirPath);
            
            list.forEach((file) => {
                file = path.resolve(dirPath, file);
                
                const stat = fs.statSync(file);
                
                if (stat && stat.isDirectory()) {
                    // Recursively get files from subdirectories
                    results = [...results, ...this.getAllFiles(file)];
                } else {
                    // Add file to results
                    results.push(file);
                }
            });
        } catch (error) {
            console.error(`Failed to read directory ${dirPath}:`, error);
        }
        
        return results;
    }

    // Generate a dummy vector for demonstration
    private generateDummyVector(content: string): number[] {
        // In a real implementation, this would use a proper embedding model
        // For now, we'll generate a simple vector based on content features
        const vector: number[] = [];
        const features = [
            content.length,
            (content.match(/\n/g) || []).length,
            (content.match(/\w+/g) || []).length,
            (content.match(/[{}]/g) || []).length,
            (content.match(/[();]/g) || []).length
        ];
        
        // Normalize features to 0-1 range and create vector
        const maxValues = [10000, 1000, 5000, 500, 500];
        for (let i = 0; i < features.length; i++) {
            vector.push(features[i] / maxValues[i]);
        }
        
        // Pad to 128 dimensions
        while (vector.length < 128) {
            vector.push(0);
        }
        
        return vector.slice(0, 128);
    }

    // Find relevant files based on a query
    public findRelevantFiles(query: string, maxResults: number = 5): RelevantFile[] {
        // Generate query vector
        const queryVector = this.generateDummyVector(query);
        
        // Calculate similarities
        const similarities: { filePath: string; similarity: number }[] = [];
        
        this.vectorIndex.forEach((entry, filePath) => {
            const similarity = this.cosineSimilarity(queryVector, entry.vector);
            similarities.push({ filePath, similarity });
        });
        
        // Sort by similarity and return top results
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults)
            .map(item => ({
                filePath: item.filePath,
                similarity: item.similarity
            }));
    }

    // Calculate cosine similarity between two vectors
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magnitudeA += vecA[i] * vecA[i];
            magnitudeB += vecB[i] * vecB[i];
        }
        
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }
        
        return dotProduct / (magnitudeA * magnitudeB);
    }

    // Add an action to session history
    public addToSessionHistory(action: any): void {
        this.sessionHistory.push({
            ...action,
            timestamp: Date.now()
        });
        
        // Save session history
        this.saveSessionHistory();
    }

    // Get recent session history
    public getRecentHistory(count: number = 5): any[] {
        return this.sessionHistory.slice(-count);
    }

    // Summarize old history entries to save space
    public summarizeHistory(): void {
        if (this.sessionHistory.length > 20) {
            // Keep the last 10 entries, summarize the rest
            const recent = this.sessionHistory.slice(-10);
            const old = this.sessionHistory.slice(0, -10);
            
            // Create summary of old entries
            const summary = {
                type: 'summary',
                count: old.length,
                timestamp: Date.now()
            };
            
            this.sessionHistory = [summary, ...recent];
            this.saveSessionHistory();
        }
    }

    // Get context for a query
    public getContextForQuery(query: string): ContextInfo {
        // Find relevant files
        const relevantFiles = this.findRelevantFiles(query);
        
        // Get file contents
        const fileContents: { [key: string]: string } = {};
        let totalTokens = 0;
        
        for (const file of relevantFiles) {
            try {
                const content = fs.readFileSync(file.filePath, 'utf8');
                const tokenCount = this.estimateTokenCount(content);
                
                // Check if adding this file would exceed token limit (roughly 3000 tokens)
                if (totalTokens + tokenCount > 3000) {
                    break;
                }
                
                fileContents[file.filePath] = content;
                totalTokens += tokenCount;
            } catch (error) {
                console.error(`Failed to read file ${file.filePath}:`, error);
            }
        }
        
        // Get recent history
        const recentHistory = this.getRecentHistory();
        
        return {
            relevantFiles: fileContents,
            recentHistory,
            totalTokens
        };
    }
}

// Type definitions
interface VectorEntry {
    filePath: string;
    hash: string;
    tokenCount: number;
    lastIndexed: number;
    vector: number[];
}

interface RelevantFile {
    filePath: string;
    similarity: number;
}

interface ContextInfo {
    relevantFiles: { [key: string]: string };
    recentHistory: any[];
    totalTokens: number;
}