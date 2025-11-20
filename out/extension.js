"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const chatPanelProvider_1 = require("./chatPanelProvider");
const inlineCompletionProvider_1 = require("./inlineCompletionProvider");
const connectionManager_1 = require("./connectionManager");
const commandHandler_1 = require("./commandHandler");
let connectionManager;
let commandHandler;
function activate(context) {
    console.log('The Parsian AI Developer Agent is now active!');
    // Create connection manager
    connectionManager = new connectionManager_1.ConnectionManager();
    // Create command handler
    commandHandler = new commandHandler_1.CommandHandler();
    // Register the connect command
    console.log('Registering the-parsian.connect command');
    let connectDisposable = vscode.commands.registerCommand('the-parsian.connect', async () => {
        console.log('the-parsian.connect command executed');
        await connectionManager.startServer();
    });
    // Register commands for opening different AI services
    console.log('Registering the-parsian.openGemini command');
    let openGeminiDisposable = vscode.commands.registerCommand('the-parsian.openGemini', () => {
        console.log('the-parsian.openGemini command executed');
        connectionManager.openAIService('gemini');
    });
    console.log('Registering the-parsian.openChatGPT command');
    let openChatGPTDisposable = vscode.commands.registerCommand('the-parsian.openChatGPT', () => {
        console.log('the-parsian.openChatGPT command executed');
        connectionManager.openAIService('chatgpt');
    });
    console.log('Registering the-parsian.openDeepSeek command');
    let openDeepSeekDisposable = vscode.commands.registerCommand('the-parsian.openDeepSeek', () => {
        console.log('the-parsian.openDeepSeek command executed');
        connectionManager.openAIService('deepseek');
    });
    // Register the chat panel command
    console.log('Registering the-parsian.openChat command');
    let chatDisposable = vscode.commands.registerCommand('the-parsian.openChat', () => {
        console.log('the-parsian.openChat command executed');
        const server = connectionManager.getServer();
        if (server) {
            chatPanelProvider_1.ChatPanelProvider.createOrShow(context.extensionUri, server);
        }
        else {
            vscode.window.showErrorMessage('The Parsian: Server not started. Please connect first.');
        }
    });
    // Register refactor command
    console.log('Registering the-parsian.refactor command');
    let refactorDisposable = vscode.commands.registerCommand('the-parsian.refactor', async () => {
        console.log('the-parsian.refactor command executed');
        const selection = vscode.window.activeTextEditor?.selection;
        if (selection) {
            const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
            if (selectedText) {
                await commandHandler.handleRefactorCommand(`refactor the following code: ${selectedText}`);
            }
        }
    });
    // Register fix bug command
    console.log('Registering the-parsian.fixBug command');
    let fixBugDisposable = vscode.commands.registerCommand('the-parsian.fixBug', async () => {
        console.log('the-parsian.fixBug command executed');
        const selection = vscode.window.activeTextEditor?.selection;
        if (selection) {
            const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
            if (selectedText) {
                await commandHandler.handleRefactorCommand(`fix any bugs in the following code: ${selectedText}`);
            }
        }
    });
    // Register the inline completion provider
    const inlineCompletionProvider = new inlineCompletionProvider_1.InlineCompletionProvider();
    const inlineCompletionDisposable = vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, inlineCompletionProvider);
    context.subscriptions.push(connectDisposable);
    context.subscriptions.push(chatDisposable);
    context.subscriptions.push(inlineCompletionDisposable);
    context.subscriptions.push(openGeminiDisposable);
    context.subscriptions.push(openChatGPTDisposable);
    context.subscriptions.push(openDeepSeekDisposable);
    context.subscriptions.push(refactorDisposable);
    context.subscriptions.push(fixBugDisposable);
    console.log('All commands registered successfully');
}
exports.activate = activate;
function deactivate() {
    if (connectionManager) {
        connectionManager.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map