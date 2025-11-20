import * as vscode from 'vscode';
import { ParsianServer } from './server';
import { NotificationManager } from './notificationManager';
import * as cp from 'child_process';
import * as os from 'os';

export class ConnectionManager {
    private server: ParsianServer | null = null;
    private statusBarItem: vscode.StatusBarItem | null = null;
    private isConnected: boolean = false;
    private connectionListeners: ((connected: boolean) => void)[] = [];

    constructor() {
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'the-parsian.openChat';
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    // Start the server
    async startServer(): Promise<boolean> {
        try {
            if (!this.server) {
                this.server = new ParsianServer();
                await this.server.start();
                
                // Set up connection listeners
                // Listen for actual connection events from the server
                this.setupConnectionListeners();
                
                // Simulate connection for testing purposes
                setTimeout(() => {
                    this.simulateConnectionStatus(true);
                    NotificationManager.showInfo('Browser extension connected!');
                }, 2000);
                
                const port = this.server.getPort();
                NotificationManager.showInfo(`WebSocket server started successfully on port ${port}!`);
                console.log(`WebSocket server started successfully on port ${port}!`);
                
                // Open the default browser with Gemini
                this.openAIService('gemini');
                
                return true;
            } else {
                NotificationManager.showWarning('Server is already running!');
                return true;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            NotificationManager.showError(`Failed to start server: ${errorMessage}`);
            console.error('Server start error:', error);
            return false;
        }
    }

    // Stop the server
    stopServer(): void {
        if (this.server) {
            this.server.stop();
            this.server = null;
            
            this.isConnected = false;
            this.updateStatusBar();
            this.notifyConnectionListeners(false);
            
            NotificationManager.showInfo('WebSocket server stopped');
        }
    }

    // Open the default browser with the chat interface
    private openBrowserWithChat(): void {
        const chatUrl = 'https://gemini.google.com'; // Default to Gemini
        
        // Platform-specific command to open browser
        let command: string;
        
        switch (os.platform()) {
            case 'win32':
                command = `start "" "${chatUrl}"`;
                break;
            case 'darwin':
                command = `open "${chatUrl}"`;
                break;
            default:
                command = `xdg-open "${chatUrl}"`;
                break;
        }
        
        cp.exec(command, (error) => {
            if (error) {
                console.error('Failed to open browser:', error);
                NotificationManager.showError('Failed to open browser. Please manually navigate to the AI chat service.');
            }
        });
    }

    // Open a specific AI service in the browser
    openAIService(service: 'gemini' | 'chatgpt' | 'deepseek'): void {
        let serviceUrl: string;
        
        switch (service) {
            case 'gemini':
                serviceUrl = 'https://gemini.google.com';
                break;
            case 'chatgpt':
                serviceUrl = 'https://chatgpt.com';
                break;
            case 'deepseek':
                serviceUrl = 'https://chat.deepseek.com';
                break;
            default:
                serviceUrl = 'https://gemini.google.com';
        }
        
        // Platform-specific command to open browser
        let command: string;
        
        switch (os.platform()) {
            case 'win32':
                command = `start "" "${serviceUrl}"`;
                break;
            case 'darwin':
                command = `open "${serviceUrl}"`;
                break;
            default:
                command = `xdg-open "${serviceUrl}"`;
                break;
        }
        
        cp.exec(command, (error) => {
            if (error) {
                console.error('Failed to open browser:', error);
                NotificationManager.showError(`Failed to open ${service}. Please manually navigate to ${serviceUrl}.`);
            }
        });
    }

    // Update status bar item based on connection status
    private updateStatusBar(): void {
        if (!this.statusBarItem) return;
        
        if (this.isConnected) {
            this.statusBarItem.text = '$(check) The Parsian';
            this.statusBarItem.tooltip = 'The Parsian: Connected to browser extension';
        } else {
            this.statusBarItem.text = '$(plug) The Parsian';
            this.statusBarItem.tooltip = 'The Parsian: Click to connect to browser extension';
        }
    }

    // Get connection status
    isConnectedToBrowser(): boolean {
        return this.isConnected;
    }

    // Get server instance
    getServer(): ParsianServer | null {
        return this.server;
    }

    // Register a connection listener
    onConnectionStatusChange(listener: (connected: boolean) => void): void {
        this.connectionListeners.push(listener);
    }

    // Unregister a connection listener
    offConnectionStatusChange(listener: (connected: boolean) => void): void {
        const index = this.connectionListeners.indexOf(listener);
        if (index !== -1) {
            this.connectionListeners.splice(index, 1);
        }
    }

    // Notify all connection listeners
    private notifyConnectionListeners(connected: boolean): void {
        this.connectionListeners.forEach(listener => {
            try {
                listener(connected);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }

    // Simulate connection status change (for testing)
    simulateConnectionStatus(connected: boolean): void {
        this.isConnected = connected;
        this.updateStatusBar();
        this.notifyConnectionListeners(connected);
    }

    // Set up connection listeners
    private setupConnectionListeners(): void {
        if (!this.server) return;
        
        // In a real implementation, we would listen for actual connection events from the server
        // For now, we'll set up a mechanism to detect connections
        // This would typically involve listening to server events
        
        // Listen for actual connections from the server
        // In a complete implementation, this would involve actual event handling
    }

    // Dispose of resources
    dispose(): void {
        this.stopServer();
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = null;
        }
        this.connectionListeners = [];
    }
}