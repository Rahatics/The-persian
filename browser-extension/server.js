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
        this.connectedClients = new Set();
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
            // Create WebSocket server
            this.wss = new ws.WebSocketServer({ port: this.port });
            console.log('WebSocket server created');
            // Write port to lock file
            fs.writeFileSync(this.lockFilePath, this.port.toString());
            console.log(`Port written to lock file: ${this.lockFilePath}`);
            // Setup event listeners
            this.wss.on('connection', (socket) => {
                console.log('Browser extension connected');
                console.log('Current connected clients:', this.connectedClients.size + 1);
                this.connectedClients.add(socket);
                socket.on('message', (message) => {
                    this.handleMessage(socket, message);
                });
                socket.on('close', () => {
                    console.log('Browser extension disconnected');
                    this.connectedClients.delete(socket);
                    console.log('Remaining connected clients:', this.connectedClients.size);
                });
                socket.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.connectedClients.delete(socket);
                    console.log('Remaining connected clients after error:', this.connectedClients.size);
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
            this.wss.close();
            this.wss = null;
            this.connectedClients.clear();
            this.messageHandlers.clear();
            // Remove lock file
            if (fs.existsSync(this.lockFilePath)) {
                fs.unlinkSync(this.lockFilePath);
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
        // In a real implementation, this would process the response and send it to the appropriate client
        // For now, we'll just log it
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
        this.connectedClients.forEach(client => {
            if (client.readyState === ws.WebSocket.OPEN) {
                try {
                    client.send(messageString);
                }
                catch (error) {
                    console.error('Error broadcasting message to client:', error);
                    // Remove client if sending failed
                    this.connectedClients.delete(client);
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
        return this.connectedClients.size;
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
        if (this.connectedClients.size === 0) {
            console.log('No connected browser extension clients');
            return false;
        }
        // Send to the first connected client
        const client = this.connectedClients.values().next().value;
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
        // Simple implementation - in a real scenario, we'd check if ports are actually free
        // For now, we'll use a fixed port for consistency
        return 8765;
    }
}
exports.ParsianServer = ParsianServer;
//# sourceMappingURL=server.js.map