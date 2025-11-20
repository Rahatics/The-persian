import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationManager } from './notificationManager';
import { ProtocolManager } from './protocolManager';
import { ParsianRequest, ParsianResponse } from './types';

export class BrowserExtensionManager {
    private lockFilePath: string = '.parsian-lock';
    private port: number | null = null;
    private isBrowserExtensionInstalled: boolean = false;
    private onMessageCallbacks: Map<string, (response: ParsianResponse) => void> = new Map();
    private pendingRequests: Map<string, { resolve: (value: ParsianResponse) => void, reject: (reason: any) => void }> = new Map();

    constructor() {
        this.checkBrowserExtensionInstallation();
    }

    // Check if the browser extension is installed
    private async checkBrowserExtensionInstallation(): Promise<void> {
        // In a real implementation, we would check if the browser extension is installed
        // For now, we'll assume it's installed if the lock file exists
        this.isBrowserExtensionInstalled = fs.existsSync(this.lockFilePath);
    }

    // Read the port from the lock file
    private async readPortFromLockFile(): Promise<number | null> {
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
        } catch (error) {
            console.error('Failed to read port from lock file:', error);
            return null;
        }
    }

    // Get the port (read from lock file if not already known)
    async getPort(): Promise<number | null> {
        if (this.port) {
            return this.port;
        }
        
        return this.readPortFromLockFile();
    }

    // Check if the browser extension is connected
    async isBrowserExtensionConnected(): Promise<boolean> {
        // In a real implementation, we would check the actual connection status
        // For now, we'll check if we can read the port from the lock file
        const port = await this.getPort();
        return port !== null;
    }

    // Send a request to the browser extension
    async sendRequest(request: ParsianRequest, timeout: number = 30000): Promise<ParsianResponse> {
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

        return new Promise<ParsianResponse>((resolve, reject) => {
            // Set timeout
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(request.id);
                reject(new Error('Request timeout'));
            }, timeout);

            // Store the promise callbacks
            this.pendingRequests.set(request.id, {
                resolve: (response: ParsianResponse) => {
                    clearTimeout(timeoutId);
                    resolve(response);
                },
                reject: (error: any) => {
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
    private simulateResponse(request: ParsianRequest): void {
        // Create a simulated response based on the request type
        let response: ParsianResponse;
        
        switch (request.action_type) {
            case 'CODE_SUGGEST':
                response = ProtocolManager.createCodeResponse(
                    request.id,
                    `// Code suggestion for: ${request.user_query}
function exampleFunction() {
  console.log('This is a simulated response');
  return true;
}`,
                    'javascript'
                );
                break;
                
            case 'EXPLAIN':
                response = ProtocolManager.createTextResponse(
                    request.id,
                    `Explanation for: ${request.user_query}\n\nThis is a simulated explanation from the AI.`
                );
                break;
                
            case 'RUN_COMMAND':
                response = ProtocolManager.createCommandResponse(
                    request.id,
                    `$ Command result for: ${request.user_query}\n\n$ simulated-command-output\n$ another-line-of-output`
                );
                break;
                
            default:
                response = ProtocolManager.createErrorResponse(
                    request.id,
                    `Unknown action type: ${request.action_type}`
                );
        }
        
        // Resolve the pending request
        const pending = this.pendingRequests.get(request.id);
        if (pending) {
            this.pendingRequests.delete(request.id);
            pending.resolve(response);
        }
    }

    // Handle incoming messages from the browser extension
    handleIncomingMessage(message: string): void {
        try {
            const parsed = ProtocolManager.parseMessage(message);
            if (!parsed) {
                console.error('Failed to parse incoming message:', message);
                return;
            }

            // If it's a response, resolve the pending request
            if ('request_id' in parsed) {
                const response = parsed as ParsianResponse;
                const pending = this.pendingRequests.get(response.request_id);
                if (pending) {
                    this.pendingRequests.delete(response.request_id);
                    pending.resolve(response);
                }
            }
            
            // If it's a request, handle it appropriately
            else if ('id' in parsed) {
                const request = parsed as ParsianRequest;
                this.handleIncomingRequest(request);
            }
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }

    // Handle incoming requests from the browser extension
    private handleIncomingRequest(request: ParsianRequest): void {
        // In a real implementation, we would handle requests from the browser extension
        // For now, we'll just log them
        console.log('Received request from browser extension:', request);
    }

    // Register a callback for specific message types
    onMessage(type: string, callback: (response: ParsianResponse) => void): void {
        this.onMessageCallbacks.set(type, callback);
    }

    // Unregister a callback
    offMessage(type: string): void {
        this.onMessageCallbacks.delete(type);
    }

    // Notify message callbacks
    private notifyMessageCallbacks(type: string, response: ParsianResponse): void {
        const callback = this.onMessageCallbacks.get(type);
        if (callback) {
            try {
                callback(response);
            } catch (error) {
                console.error('Error in message callback:', error);
            }
        }
    }

    // Install the browser extension (simulated)
    async installBrowserExtension(): Promise<boolean> {
        try {
            NotificationManager.showProgress('Installing browser extension', async (progress) => {
                progress.report({ message: 'Downloading extension...' });
                await this.delay(1000);
                
                progress.report({ message: 'Installing extension...' });
                await this.delay(1000);
                
                progress.report({ message: 'Finishing setup...' });
                await this.delay(500);
                
                this.isBrowserExtensionInstalled = true;
                NotificationManager.showInfo('Browser extension installed successfully!');
                return true;
            });
            
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            NotificationManager.showError(`Failed to install browser extension: ${errorMessage}`);
            return false;
        }
    }

    // Open browser extension installation page
    async openInstallationPage(): Promise<void> {
        // In a real implementation, we would open the browser extension store page
        NotificationManager.showInfo('Please install the browser extension from the Chrome Web Store or Firefox Add-ons.');
    }

    // Utility function for delays
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Dispose of resources
    dispose(): void {
        this.onMessageCallbacks.clear();
        this.pendingRequests.clear();
    }
}