"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagManager = void 0;
const fs = require("fs");
const path = require("path");
const crypto_1 = require("crypto");
class RagManager {
    constructor() {
        this.vectorIndex = new Map();
        this.sessionHistory = [];
        this.INDEX_FILE = '.parsian/index.json';
        this.SESSION_FILE = '.parsian/session.json';
        this.IGNORE_PATTERNS = [
            /\.git/,
            /node_modules/,
            /dist/,
            /build/,
            /\.vscode/,
            /\.DS_Store/,
            /Thumbs\.db/
        ];
        this.loadIndex();
        this.loadSessionHistory();
    }
    // Load existing vector index from file
    loadIndex() {
        try {
            if (fs.existsSync(this.INDEX_FILE)) {
                const data = fs.readFileSync(this.INDEX_FILE, 'utf8');
                const parsed = JSON.parse(data);
                this.vectorIndex = new Map(Object.entries(parsed));
            }
        }
        catch (error) {
            console.error('Failed to load vector index:', error);
        }
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
    // Save vector index to file
    saveIndex() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.INDEX_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Save index
            const obj = Object.fromEntries(this.vectorIndex);
            fs.writeFileSync(this.INDEX_FILE, JSON.stringify(obj, null, 2));
        }
        catch (error) {
            console.error('Failed to save vector index:', error);
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
            // Keep only the last 10 actions
            const recentHistory = this.sessionHistory.slice(-10);
            fs.writeFileSync(this.SESSION_FILE, JSON.stringify(recentHistory, null, 2));
        }
        catch (error) {
            console.error('Failed to save session history:', error);
        }
    }
    // Check if a file should be ignored
    shouldIgnore(filePath) {
        return this.IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
    }
    // Generate a hash for a file content
    generateHash(content) {
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    }
    // Estimate token count for content
    estimateTokenCount(content) {
        // Simple estimation: average 4 characters per token
        return Math.ceil(content.length / 4);
    }
    // Index a file
    indexFile(filePath) {
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
            const entry = {
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
        }
        catch (error) {
            console.error(`Failed to index file ${filePath}:`, error);
        }
    }
    // Index all files in a directory
    indexDirectory(dirPath) {
        try {
            const files = this.getAllFiles(dirPath);
            files.forEach(file => this.indexFile(file));
        }
        catch (error) {
            console.error(`Failed to index directory ${dirPath}:`, error);
        }
    }
    // Get all files in a directory (recursive)
    getAllFiles(dirPath) {
        let results = [];
        try {
            const list = fs.readdirSync(dirPath);
            list.forEach((file) => {
                file = path.resolve(dirPath, file);
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    // Recursively get files from subdirectories
                    results = [...results, ...this.getAllFiles(file)];
                }
                else {
                    // Add file to results
                    results.push(file);
                }
            });
        }
        catch (error) {
            console.error(`Failed to read directory ${dirPath}:`, error);
        }
        return results;
    }
    // Generate a more realistic vector for demonstration
    // In a real implementation, this would use a proper embedding model
    generateDummyVector(content) {
        // Simple but more effective text embedding approach
        // Based on term frequency and position weighting
        // Convert to lowercase and split into words
        const words = content.toLowerCase().match(/\b\w+\b/g) || [];
        // Define a simple vocabulary of common programming terms
        const vocabulary = [
            'function', 'class', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return',
            'import', 'export', 'from', 'require', 'module', 'this', 'new', 'try', 'catch',
            'async', 'await', 'promise', 'callback', 'array', 'object', 'string', 'number',
            'boolean', 'null', 'undefined', 'true', 'false', 'console', 'log', 'error',
            'debug', 'test', 'describe', 'it', 'expect', 'assert', 'equal', 'not',
            'component', 'render', 'state', 'props', 'use', 'effect', 'context',
            'request', 'response', 'get', 'post', 'put', 'delete', 'fetch', 'axios',
            'database', 'query', 'select', 'insert', 'update', 'delete', 'table', 'model',
            'schema', 'validation', 'middleware', 'route', 'controller', 'service',
            'config', 'environment', 'process', 'env', 'port', 'host', 'server',
            'client', 'api', 'endpoint', 'json', 'xml', 'html', 'css', 'scss', 'sass',
            'javascript', 'typescript', 'python', 'java', 'csharp', 'php', 'ruby',
            'react', 'angular', 'vue', 'node', 'express', 'koa', 'fastify',
            'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
            'docker', 'kubernetes', 'container', 'image', 'volume', 'network',
            'git', 'commit', 'push', 'pull', 'merge', 'branch', 'checkout',
            'webpack', 'babel', 'eslint', 'prettier', 'jest', 'mocha', 'chai'
        ];
        // Initialize vector with zeros
        const vector = new Array(128).fill(0);
        // Count occurrences of each vocabulary term
        const termCounts = {};
        words.forEach(word => {
            if (vocabulary.includes(word)) {
                termCounts[word] = (termCounts[word] || 0) + 1;
            }
        });
        // Fill vector with term frequencies
        vocabulary.forEach((term, index) => {
            if (index < 128) { // Only use first 128 terms to fit in vector
                const count = termCounts[term] || 0;
                // Normalize by document length (TF - Term Frequency)
                vector[index] = count / Math.max(words.length, 1);
            }
        });
        // Add some additional features
        const additionalFeatures = [
            content.length / 10000,
            (content.match(/\n/g) || []).length / 1000,
            (content.match(/\w+/g) || []).length / 5000,
            (content.match(/[{}]/g) || []).length / 500,
            (content.match(/[();]/g) || []).length / 500 // Parentheses count normalized
        ];
        // Add additional features to the end of the vector
        for (let i = 0; i < additionalFeatures.length && 128 - 10 + i < 128; i++) {
            vector[128 - 10 + i] = additionalFeatures[i];
        }
        return vector;
    }
    // Find relevant files based on a query
    findRelevantFiles(query, maxResults = 5) {
        // Generate query vector
        const queryVector = this.generateDummyVector(query);
        // Calculate similarities
        const similarities = [];
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
    cosineSimilarity(vecA, vecB) {
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
    addToSessionHistory(action) {
        this.sessionHistory.push({
            ...action,
            timestamp: Date.now()
        });
        // Save session history
        this.saveSessionHistory();
    }
    // Get recent session history
    getRecentHistory(count = 5) {
        return this.sessionHistory.slice(-count);
    }
    // Summarize old history entries to save space
    summarizeHistory() {
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
    getContextForQuery(query) {
        // Find relevant files
        const relevantFiles = this.findRelevantFiles(query);
        // Get file contents
        const fileContents = {};
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
            }
            catch (error) {
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
exports.RagManager = RagManager;
//# sourceMappingURL=ragManager.js.map