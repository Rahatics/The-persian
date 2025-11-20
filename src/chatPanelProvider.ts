import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ParsianRequest, ParsianResponse } from './types';
import { ParsianServer } from './server';
import { ContextManager } from './contextManager';
import { DiffApplier } from './diffApplier';

export class ChatPanelProvider {
    private static currentPanel: ChatPanelProvider | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _server: ParsianServer | null = null;
    private _contextManager: ContextManager;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, server: ParsianServer) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._server = server;
        this._contextManager = new ContextManager();

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'panelReady':
                        this.handlePanelReady();
                        break;
                    case 'userMessage':
                        this.handleUserMessage(message.content);
                        break;
                    case 'openAIService':
                        if (this._server) {
                            // Forward the request to open an AI service
                            // This would typically call a method on the server or connection manager
                            vscode.commands.executeCommand(`the-parsian.open${message.service.charAt(0).toUpperCase() + message.service.slice(1)}`);
                        }
                        break;
                    case 'applyCode':
                        this.handleApplyCode(message.code, message.language);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, server: ParsianServer) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ChatPanelProvider.currentPanel) {
            ChatPanelProvider.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'parsianChat',
            'The Parsian AI Developer Agent',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ChatPanelProvider.currentPanel = new ChatPanelProvider(panel, extensionUri, server);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, server: ParsianServer) {
        ChatPanelProvider.currentPanel = new ChatPanelProvider(panel, extensionUri, server);
    }

    public dispose() {
        ChatPanelProvider.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();
        this._contextManager.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async handlePanelReady() {
        // Send connection status to the webview
        this._panel.webview.postMessage({
            type: 'connectionStatus',
            connected: this._server !== null
        });

        // Show suggestion chips if connected
        if (this._server !== null) {
            this._panel.webview.postMessage({
                type: 'showSuggestions'
            });
        }
    }

    private async handleUserMessage(content: string) {
        // Add user message to session history
        this._contextManager.addToSessionHistory({
            type: 'user_query',
            content: content,
            timestamp: Date.now()
        });

        // Check for specific commands
        if (content.toLowerCase().includes('scan project structure') || content.toLowerCase().includes('scan the project structure')) {
            this.handleProjectScanRequest();
            return;
        }

        if (!this._server) {
            this._panel.webview.postMessage({
                type: 'error',
                content: 'Not connected to the browser extension'
            });
            return;
        }

        // Get context for the query
        const activeEditor = vscode.window.activeTextEditor;
        const filePath = activeEditor?.document.fileName;
        const codeSnippet = activeEditor?.document.getText();
        
        const context = await this._contextManager.getContextForQuery(content, filePath);

        // Create a request object with context
        const request: ParsianRequest = {
            id: uuidv4(),
            system_role: 'STRICT_JSON_ONLY_MODE',
            action_type: 'CODE_SUGGEST',
            context: {
                file_path: filePath,
                code_snippet: codeSnippet,
                project_context: context,
                recent_history: context.recentHistory
            },
            user_query: content
        };

        // Send request to the browser extension through the WebSocket server
        if (this._server) {
            // Show typing indicator while waiting for response
            this._panel.webview.postMessage({
                type: 'showTyping'
            });
            
            // Register a handler for the response
            const responseHandler = (data: any) => {
                if (data.request_id === request.id) {
                    // Remove the handler since we've got our response
                    this._server?.unregisterMessageHandler(`response_${request.id}`);
                    
                    // Hide typing indicator
                    this._panel.webview.postMessage({
                        type: 'hideTyping'
                    });
                    
                    // Process the response
                    if (data.status === 'success') {
                        // Add AI response to session history
                        this._contextManager.addToSessionHistory({
                            type: 'ai_response',
                            content: data.data.content,
                            timestamp: Date.now()
                        });

                        // If the response contains code, offer to apply it
                        if (data.data.language === 'javascript' || data.data.language === 'typescript' || 
                            data.data.language === 'python' || data.data.language === 'java' ||
                            data.data.content.includes('```')) {
                            // Send a message to the webview to show apply code button
                            this._panel.webview.postMessage({
                                type: 'showApplyCodeButton',
                                code: data.data.content,
                                language: data.data.language
                            });
                        } else {
                            // For non-code responses, just show the response
                            this._panel.webview.postMessage({
                                type: 'aiResponse',
                                content: data.data.content,
                                language: data.data.language
                            });
                        }
                    } else {
                        // Handle error response
                        this._panel.webview.postMessage({
                            type: 'error',
                            content: data.message || 'Unknown error occurred'
                        });
                    }
                }
            };
            
            // Register the response handler
            this._server.registerMessageHandler(`response_${request.id}`, responseHandler);
            
            // Send the request
            const sent = this._server.sendRequestToBrowserExtension(request);
            
            if (!sent) {
                // Remove the handler since we couldn't send the request
                this._server?.unregisterMessageHandler(`response_${request.id}`);
                
                // Hide typing indicator
                this._panel.webview.postMessage({
                    type: 'hideTyping'
                });
                
                this._panel.webview.postMessage({
                    type: 'error',
                    content: 'Failed to send request to browser extension'
                });
            }
        } else {
            this._panel.webview.postMessage({
                type: 'error',
                content: 'Server not available'
            });
        }
    }

    private async handleProjectScanRequest() {
        // Show typing indicator
        this._panel.webview.postMessage({
            type: 'showTyping'
        });

        // Simulate processing delay
        setTimeout(() => {
            // Get the workspace root path
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                this._panel.webview.postMessage({
                    type: 'error',
                    content: 'No workspace folder found'
                });
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            
            // Scan the project structure
            const projectStructure = this.scanProjectStructure(rootPath);
            
            // Create a formatted response
            const responseContent = `// Project Structure Overview

${projectStructure}

// Summary
This project contains ${this.countFiles(projectStructure)} files and ${this.countDirectories(projectStructure)} directories.`;

            // Add AI response to session history
            this._contextManager.addToSessionHistory({
                type: 'ai_response',
                content: responseContent,
                timestamp: Date.now()
            });

            // Hide typing indicator and show response
            this._panel.webview.postMessage({
                type: 'aiResponse',
                content: responseContent,
                language: 'text'
            });
        }, 1500);
    }

    private scanProjectStructure(rootPath: string, maxDepth: number = 3): string {
        try {
            const result: string[] = [];
            this.scanDirectory(rootPath, result, 0, maxDepth, rootPath);
            return result.join('\n');
        } catch (error) {
            return `Error scanning project structure: ${error}`;
        }
    }

    private scanDirectory(dirPath: string, result: string[], currentDepth: number, maxDepth: number, rootPath: string): void {
        if (currentDepth > maxDepth) {
            return;
        }

        try {
            const items = fs.readdirSync(dirPath);
            
            // Sort items: directories first, then files
            const sortedItems = items
                .map((item: string) => {
                    const fullPath = path.join(dirPath, item);
                    const stat = fs.statSync(fullPath);
                    return { name: item, isDirectory: stat.isDirectory() };
                })
                .sort((a: { name: string; isDirectory: boolean }, b: { name: string; isDirectory: boolean }) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });

            for (const item of sortedItems) {
                const fullPath = path.join(dirPath, item.name);
                const relativePath = path.relative(rootPath, fullPath);
                
                // Skip hidden files and directories
                if (item.name.startsWith('.')) continue;
                
                // Skip common build/dependency directories
                if (item.name === 'node_modules' || item.name === 'dist' || item.name === 'build') continue;
                
                const indent = '  '.repeat(currentDepth);
                
                if (item.isDirectory) {
                    result.push(`${indent}📁 ${item.name}/`);
                    if (currentDepth < maxDepth) {
                        this.scanDirectory(fullPath, result, currentDepth + 1, maxDepth, rootPath);
                    }
                } else {
                    result.push(`${indent}📄 ${item.name}`);
                }
            }
        } catch (error) {
            const relativePath = path.relative(rootPath, dirPath);
            const indent = '  '.repeat(currentDepth);
            result.push(`${indent}❌ Error reading directory: ${relativePath}`);
        }
    }

    private countFiles(structure: string): number {
        return (structure.match(/📄/g) || []).length;
    }

    private countDirectories(structure: string): number {
        return (structure.match(/📁/g) || []).length;
    }

    private handleApplyCode(code: string, language: string) {
        // Use the static DiffApplier methods
        DiffApplier.applyCodeChange(code, language);
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'src', 'ui', 'chatPanel.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Local path to css styles
        const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
        const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
        const stylesPathChatPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'ui', 'chatPanel.css');

        // Uri to load styles into webview
        const stylesResetUri = webview.asWebviewUri(styleResetPath);
        const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
        const stylesChatUri = webview.asWebviewUri(stylesPathChatPath);

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <!--
                    Use a content security policy to only allow loading images from https or from our extension directory,
                    and only allow scripts that have a specific nonce.
                -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesResetUri}" rel="stylesheet">
                <link href="${stylesMainUri}" rel="stylesheet">
                <link href="${stylesChatUri}" rel="stylesheet">
                <title>The Parsian AI Developer Agent</title>
            </head>
            <body>
                <div class="header">
                    <img src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'media', 'TheParsian.svg'))}" alt="The Parsian Logo" class="logo">
                    <h1 class="header-title">The Parsian AI Developer Agent</h1>
                    <div class="connection-status">
                        <div class="status-dot disconnected" id="status-dot"></div>
                        <span id="status-text">Disconnected</span>
                    </div>
                </div>

                <!-- Model Selection -->
                <div class="model-selection">
                    <button class="model-button active" id="gemini-button">Gemini</button>
                    <button class="model-button" id="chatgpt-button">ChatGPT</button>
                    <button class="model-button" id="deepseek-button">DeepSeek</button>
                </div>

                <div class="chat-container" id="chat-container">
                    <!-- Messages will be inserted here -->
                </div>

                <div class="typing-indicator hidden" id="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <span style="margin-left: 10px;">Thinking...</span>
                </div>

                <div class="suggestion-chips hidden" id="suggestion-chips">
                    <div class="suggestion-chip" data-action="scan">Scan project structure</div>
                    <div class="suggestion-chip" data-action="bugs">Find bugs</div>
                    <div class="suggestion-chip" data-action="test">Write unit test</div>
                    <div class="suggestion-chip" data-action="optimize">Optimize this function</div>
                </div>

                <!-- Debug Box for Error Logs -->
                <div id="debug-box" class="debug-box">
                    <div class="debug-header">
                        <strong>Debug Logs</strong>
                        <div class="debug-controls">
                            <button id="clear-logs" class="debug-button">Clear</button>
                            <button id="copy-logs" class="debug-button">Copy Logs</button>
                        </div>
                    </div>
                    <textarea id="error-logs" class="error-logs" readonly></textarea>
                </div>

                <div class="input-container">
                    <textarea class="message-input" id="message-input" placeholder="Ask The Parsian anything about your code..." rows="1"></textarea>
                    <button class="send-button" id="send-button">Send</button>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}