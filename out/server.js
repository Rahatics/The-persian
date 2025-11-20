"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsianServer = void 0;
const ws = require("ws");
const fs = require("fs");
class ParsianServer {
    constructor() {
        this.wss = null;
        this.port = 0;
        this.lockFilePath = '.parsian-lock';
        this.browserClients = new Set();
        this.vscodeClients = new Set();
        this.messageHandlers = new Map();
    }
    // Getter for port
    getPort() {
        return this.port;
    }
    async start() {
        try {
            console.log('Starting The Parsian WebSocket server...');
            // Find a free port
            this.port = await this.findFreePort();
            console.log(`Using port: ${this.port}`);
            // Check if lock file exists and is stale
            if (fs.existsSync(this.lockFilePath)) {
                try {
                    const lockFileContent = fs.readFileSync(this.lockFilePath, 'utf8');
                    const lockPort = parseInt(lockFileContent.trim());
                    // Check if the port in the lock file is still in use
                    if (lockPort && !(await this.isPortFree(lockPort))) {
                        console.log(`Lock file exists but port ${lockPort} is still in use`);
                        // If the port is in use by another instance, find a different port
                        if (lockPort === this.port) {
                            this.port = await this.findFreePort();
                            console.log(`Changed to different port: ${this.port}`);
                        }
                    }
                    else {
                        console.log('Lock file exists but port is free, removing stale lock file');
                        fs.unlinkSync(this.lockFilePath);
                    }
                }
                catch (error) {
                    console.log('Error reading lock file, removing it');
                    fs.unlinkSync(this.lockFilePath);
                }
            }
            // Create WebSocket server
            this.wss = new ws.WebSocketServer({ port: this.port });
            console.log('WebSocket server created');
            // Write port to lock file
            fs.writeFileSync(this.lockFilePath, this.port.toString());
            console.log(`Port written to lock file: ${this.lockFilePath}`);
            // Setup event listeners
            this.wss.on('connection', (socket, request) => {
                console.log('New client connected');
                // Determine if this is a browser extension or VS Code extension based on user agent or other headers
                const userAgent = request.headers['user-agent'] || '';
                console.log('User agent:', userAgent);
                // For now, we'll assume the first connection is the browser extension
                // and any additional connections are VS Code extensions
                if (this.browserClients.size === 0) {
                    console.log('Browser extension connected');
                    this.browserClients.add(socket);
                }
                else {
                    console.log('VS Code extension connected');
                    this.vscodeClients.add(socket);
                }
                console.log('Current browser clients:', this.browserClients.size);
                console.log('Current VS Code clients:', this.vscodeClients.size);
                socket.on('message', (message) => {
                    this.handleMessage(socket, message);
                });
                socket.on('close', () => {
                    console.log('Client disconnected');
                    this.browserClients.delete(socket);
                    this.vscodeClients.delete(socket);
                    console.log('Remaining browser clients:', this.browserClients.size);
                    console.log('Remaining VS Code clients:', this.vscodeClients.size);
                });
                socket.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.browserClients.delete(socket);
                    this.vscodeClients.delete(socket);
                    console.log('Remaining browser clients after error:', this.browserClients.size);
                    console.log('Remaining VS Code clients after error:', this.vscodeClients.size);
                });
            });
            // Add error listener to the WebSocket server
            this.wss.on('error', (error) => {
                console.error('WebSocket server error:', error);
            });
            // Add listening event to confirm the server is actually listening
            this.wss.on('listening', () => {
                console.log('WebSocket server is now listening for connections');
            });
            console.log(`The Parsian WebSocket server started on port ${this.port}`);
        }
        catch (error) {
            console.error('Failed to start WebSocket server:', error);
            throw error;
        }
    }
    stop() {
        if (this.wss) {
            this.wss.close(() => {
                console.log('WebSocket server closed');
            });
            this.wss = null;
            this.browserClients.clear();
            this.vscodeClients.clear();
            this.messageHandlers.clear();
            // Remove lock file
            if (fs.existsSync(this.lockFilePath)) {
                try {
                    fs.unlinkSync(this.lockFilePath);
                    console.log('Lock file removed');
                }
                catch (error) {
                    console.error('Error removing lock file:', error);
                }
            }
        }
    }
    handleMessage(socket, message) {
        try {
            const requestData = JSON.parse(message.toString());
            console.log('Received request:', requestData);
            // Check message type
            if (requestData.action_type) {
                // This is a request from VS Code extension
                // Check if there's a custom handler for this message type
                if (this.messageHandlers.has(requestData.action_type)) {
                    const handler = this.messageHandlers.get(requestData.action_type);
                    if (handler) {
                        handler(requestData);
                        return;
                    }
                }
                // Process the request based on action type
                switch (requestData.action_type) {
                    case 'CODE_SUGGEST':
                        this.handleCodeSuggestion(socket, requestData);
                        break;
                    case 'EXPLAIN':
                        this.handleExplanationRequest(socket, requestData);
                        break;
                    case 'RUN_COMMAND':
                        this.handleCommandRequest(socket, requestData);
                        break;
                    default:
                        console.warn('Unknown action type:', requestData.action_type);
                        this.sendError(socket, requestData.id, 'Unknown action type');
                }
            }
            else if (requestData.request_id) {
                // This is a response from browser extension with a request ID
                // Check if there's a custom handler for this response
                const handlerKey = `response_${requestData.request_id}`;
                if (this.messageHandlers.has(handlerKey)) {
                    const handler = this.messageHandlers.get(handlerKey);
                    if (handler) {
                        handler(requestData);
                        return;
                    }
                }
                // If no specific handler, log the response
                console.log('Received response from browser extension:', requestData);
            }
            else if (requestData.type) {
                // This is a message from browser extension
                switch (requestData.type) {
                    case 'ai_response':
                        this.handleAIResponse(socket, requestData);
                        break;
                    case 'rate_limit_detected':
                        this.handleRateLimitDetected(socket, requestData);
                        break;
                    case 'captcha_detected':
                        this.handleCaptchaDetected(socket, requestData);
                        break;
                    default:
                        console.warn('Unknown message type from browser:', requestData.type);
                }
            }
            else {
                console.warn('Unknown message format:', requestData);
            }
        }
        catch (error) {
            console.error('Error processing message:', error);
            this.sendError(socket, 'unknown', 'Invalid request format');
        }
    }
    handleCodeSuggestion(socket, request) {
        console.log('Handling code suggestion request:', request);
        // In a real implementation, this would process the request and get a response from the AI
        // For now, we'll send a placeholder response
        const responseData = {
            request_id: request.id,
            status: 'success',
            data: {
                content: `// Code suggestion for: ${request.user_query}
function exampleFunction() {
  console.log('This is a placeholder response');
  return true;
}`,
                language: 'javascript'
            },
            security: {
                requires_confirmation: false,
                confidence: 'high'
            }
        };
        this.sendMessageWithErrorHandling(socket, responseData);
    }
    handleExplanationRequest(socket, request) {
        console.log('Handling explanation request:', request);
        // In a real implementation, this would process the request and get a response from the AI
        // For now, we'll send a placeholder response
        const responseData = {
            request_id: request.id,
            status: 'success',
            data: {
                content: `Explanation for: ${request.user_query}\n\nThis is a placeholder explanation that would typically provide detailed information about the requested topic.`,
                language: 'text'
            },
            security: {
                requires_confirmation: false,
                confidence: 'high'
            }
        };
        this.sendMessageWithErrorHandling(socket, responseData);
    }
    handleCommandRequest(socket, request) {
        console.log('Handling command request:', request);
        // In a real implementation, this would process the request and get a response from the AI
        // For now, we'll send a placeholder response
        const responseData = {
            request_id: request.id,
            status: 'success',
            data: {
                content: `$ Command result for: ${request.user_query}\n\n$ placeholder-command-output\n$ another-line-of-output`,
                language: 'bash'
            },
            security: {
                requires_confirmation: true,
                confidence: 'medium'
            }
        };
        this.sendMessageWithErrorHandling(socket, responseData);
    }
    sendError(socket, requestId, message) {
        const errorResponse = {
            request_id: requestId,
            status: 'error',
            message: message
        };
        this.sendMessageToClient(socket, errorResponse);
    }
    // Send a message with error handling
    sendMessageWithErrorHandling(socket, message) {
        try {
            this.sendMessageToClient(socket, message);
            return true;
        }
        catch (error) {
            console.error('Error sending message to client:', error);
            return false;
        }
    }
    handleAIResponse(socket, data) {
        console.log('Received AI response from browser extension:', data);
        // Forward the AI response to the VS Code extension
        // Create a response object that matches what VS Code expects
        const response = {
            type: 'ai_response',
            content: data.content,
            codeBlocks: data.codeBlocks || [],
            language: 'text' // Default language, could be detected from content
        };
        // Broadcast the response to all connected VS Code clients
        this.broadcastMessage(response);
        console.log('AI Response Content:', data.content);
        console.log('AI Response Code Blocks:', data.codeBlocks);
        // Send acknowledgment back to browser extension
        this.sendMessageToClient(socket, { type: 'ack', message: 'AI response received' });
    }
    handleRateLimitDetected(socket, data) {
        console.log('Rate limit detected from browser extension at:', new Date(data.timestamp));
        // In a real implementation, this would notify the VS Code extension
        // and potentially pause requests for a period of time
        // Send acknowledgment back to browser extension
        this.sendMessageToClient(socket, { type: 'ack', message: 'Rate limit detected' });
    }
    handleCaptchaDetected(socket, data) {
        console.log('CAPTCHA detected from browser extension at:', new Date(data.timestamp));
        // In a real implementation, this would notify the VS Code extension
        // and potentially show a notification to the user
        // Send acknowledgment back to browser extension
        this.sendMessageToClient(socket, { type: 'ack', message: 'CAPTCHA detected' });
    }
    // Send a message to all connected clients
    broadcastMessage(message) {
        const messageString = JSON.stringify(message);
        this.vscodeClients.forEach((client) => {
            if (client.readyState === ws.WebSocket.OPEN) {
                try {
                    client.send(messageString);
                }
                catch (error) {
                    console.error('Error broadcasting message to client:', error);
                    // Remove client if sending failed
                    this.vscodeClients.delete(client);
                }
            }
        });
    }
    // Send a message to a specific client
    sendMessageToClient(client, message) {
        if (client.readyState === ws.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }
    // Get the number of connected clients
    getConnectedClientCount() {
        return this.browserClients.size + this.vscodeClients.size;
    }
    // Register a message handler
    registerMessageHandler(type, handler) {
        this.messageHandlers.set(type, handler);
    }
    // Unregister a message handler
    unregisterMessageHandler(type) {
        this.messageHandlers.delete(type);
    }
    // Send a request to the browser extension
    sendRequestToBrowserExtension(request) {
        if (this.browserClients.size === 0) {
            console.log('No connected browser extension clients');
            return false;
        }
        // Send to the first connected client
        const client = this.browserClients.values().next().value;
        if (client && client.readyState === ws.WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(request));
                console.log('Request sent to browser extension:', request);
                return true;
            }
            catch (error) {
                console.error('Error sending request to browser extension:', error);
                return false;
            }
        }
        console.log('No open connection to browser extension');
        return false;
    }
    async findFreePort() {
        // Try to find a free port starting from 8765
        const net = require('net');
        const commonPorts = [8765, 8766, 8767, 8768, 8769];
        // First try common ports
        for (const port of commonPorts) {
            if (await this.isPortFree(port)) {
                return port;
            }
        }
        // If common ports are taken, find any free port
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.unref();
            server.on('error', reject);
            // Listen on port 0 to get a random free port
            server.listen(0, () => {
                const addressInfo = server.address();
                const freePort = addressInfo.port;
                server.close(() => {
                    resolve(freePort);
                });
            });
        });
    }
    // Check if a port is free
    async isPortFree(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const tester = net.createServer()
                .once('error', () => resolve(false))
                .once('listening', () => tester.close(() => resolve(true)))
                .listen(port, '127.0.0.1');
        });
    }
}
exports.ParsianServer = ParsianServer;
//# sourceMappingURL=server.js.map