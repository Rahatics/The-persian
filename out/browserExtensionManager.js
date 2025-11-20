"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserExtensionManager = void 0;
const fs = require("fs");
const notificationManager_1 = require("./notificationManager");
const protocolManager_1 = require("./protocolManager");
class BrowserExtensionManager {
    constructor() {
        this.lockFilePath = '.parsian-lock';
        this.port = null;
        this.isBrowserExtensionInstalled = false;
        this.onMessageCallbacks = new Map();
        this.pendingRequests = new Map();
        this.checkBrowserExtensionInstallation();
    }
    // Check if the browser extension is installed
    async checkBrowserExtensionInstallation() {
        // In a real implementation, we would check if the browser extension is installed
        // For now, we'll assume it's installed if the lock file exists
        this.isBrowserExtensionInstalled = fs.existsSync(this.lockFilePath);
    }
    // Read the port from the lock file
    async readPortFromLockFile() {
        try {
            if (fs.existsSync(this.lockFilePath)) {
                const portString = fs.readFileSync(this.lockFilePath, 'utf8').trim();
                const port = parseInt(portString, 10);
                if (!isNaN(port)) {
                    this.port = port;
                    return port;
                }
            }
            return null;
        }
        catch (error) {
            console.error('Failed to read port from lock file:', error);
            return null;
        }
    }
    // Get the port (read from lock file if not already known)
    async getPort() {
        if (this.port) {
            return this.port;
        }
        return this.readPortFromLockFile();
    }
    // Check if the browser extension is connected
    async isBrowserExtensionConnected() {
        // In a real implementation, we would check the actual connection status
        // For now, we'll check if we can read the port from the lock file
        const port = await this.getPort();
        return port !== null;
    }
    // Send a request to the browser extension
    async sendRequest(request, timeout = 30000) {
        // Check if browser extension is installed
        if (!this.isBrowserExtensionInstalled) {
            throw new Error('Browser extension is not installed');
        }
        // Get port
        const port = await this.getPort();
        if (!port) {
            throw new Error('Could not determine browser extension port');
        }
        // In a real implementation, we would send the request via WebSocket
        // For now, we'll simulate the response
        return new Promise((resolve, reject) => {
            // Set timeout
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(request.id);
                reject(new Error('Request timeout'));
            }, timeout);
            // Store the promise callbacks
            this.pendingRequests.set(request.id, {
                resolve: (response) => {
                    clearTimeout(timeoutId);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
            // Simulate sending the request
            console.log('Sending request to browser extension:', request);
            // Simulate a response after a short delay
            setTimeout(() => {
                this.simulateResponse(request);
            }, 1000);
        });
    }
    // Simulate a response from the browser extension
    simulateResponse(request) {
        // Create a simulated response based on the request type
        let response;
        switch (request.action_type) {
            case 'CODE_SUGGEST':
                response = protocolManager_1.ProtocolManager.createCodeResponse(request.id, `// Code suggestion for: ${request.user_query}
function exampleFunction() {
  console.log('This is a simulated response');
  return true;
}`, 'javascript');
                break;
            case 'EXPLAIN':
                response = protocolManager_1.ProtocolManager.createTextResponse(request.id, `Explanation for: ${request.user_query}\n\nThis is a simulated explanation from the AI.`);
                break;
            case 'RUN_COMMAND':
                response = protocolManager_1.ProtocolManager.createCommandResponse(request.id, `$ Command result for: ${request.user_query}\n\n$ simulated-command-output\n$ another-line-of-output`);
                break;
            default:
                response = protocolManager_1.ProtocolManager.createErrorResponse(request.id, `Unknown action type: ${request.action_type}`);
        }
        // Resolve the pending request
        const pending = this.pendingRequests.get(request.id);
        if (pending) {
            this.pendingRequests.delete(request.id);
            pending.resolve(response);
        }
    }
    // Handle incoming messages from the browser extension
    handleIncomingMessage(message) {
        try {
            const parsed = protocolManager_1.ProtocolManager.parseMessage(message);
            if (!parsed) {
                console.error('Failed to parse incoming message:', message);
                return;
            }
            // If it's a response, resolve the pending request
            if ('request_id' in parsed) {
                const response = parsed;
                const pending = this.pendingRequests.get(response.request_id);
                if (pending) {
                    this.pendingRequests.delete(response.request_id);
                    pending.resolve(response);
                }
            }
            // If it's a request, handle it appropriately
            else if ('id' in parsed) {
                const request = parsed;
                this.handleIncomingRequest(request);
            }
        }
        catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }
    // Handle incoming requests from the browser extension
    handleIncomingRequest(request) {
        // In a real implementation, we would handle requests from the browser extension
        // For now, we'll just log them
        console.log('Received request from browser extension:', request);
    }
    // Register a callback for specific message types
    onMessage(type, callback) {
        this.onMessageCallbacks.set(type, callback);
    }
    // Unregister a callback
    offMessage(type) {
        this.onMessageCallbacks.delete(type);
    }
    // Notify message callbacks
    notifyMessageCallbacks(type, response) {
        const callback = this.onMessageCallbacks.get(type);
        if (callback) {
            try {
                callback(response);
            }
            catch (error) {
                console.error('Error in message callback:', error);
            }
        }
    }
    // Install the browser extension (simulated)
    async installBrowserExtension() {
        try {
            notificationManager_1.NotificationManager.showProgress('Installing browser extension', async (progress) => {
                progress.report({ message: 'Downloading extension...' });
                await this.delay(1000);
                progress.report({ message: 'Installing extension...' });
                await this.delay(1000);
                progress.report({ message: 'Finishing setup...' });
                await this.delay(500);
                this.isBrowserExtensionInstalled = true;
                notificationManager_1.NotificationManager.showInfo('Browser extension installed successfully!');
                return true;
            });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            notificationManager_1.NotificationManager.showError(`Failed to install browser extension: ${errorMessage}`);
            return false;
        }
    }
    // Open browser extension installation page
    async openInstallationPage() {
        // In a real implementation, we would open the browser extension store page
        notificationManager_1.NotificationManager.showInfo('Please install the browser extension from the Chrome Web Store or Firefox Add-ons.');
    }
    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Dispose of resources
    dispose() {
        this.onMessageCallbacks.clear();
        this.pendingRequests.clear();
    }
}
exports.BrowserExtensionManager = BrowserExtensionManager;
//# sourceMappingURL=browserExtensionManager.js.map