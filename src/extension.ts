import * as vscode from 'vscode';
import { ChatPanelProvider } from './chatPanelProvider';
import { InlineCompletionProvider } from './inlineCompletionProvider';
import { ConnectionManager } from './connectionManager';
import { CommandHandler } from './commandHandler';

let connectionManager: ConnectionManager;
let commandHandler: CommandHandler;

export function activate(context: vscode.ExtensionContext) {
	console.log('The Parsian AI Developer Agent is now active!');

	// Create connection manager
	connectionManager = new ConnectionManager();
	
	// Create command handler
	commandHandler = new CommandHandler();

	// Register the connect command
	let connectDisposable = vscode.commands.registerCommand('the-parsian.connect', async () => {
		await connectionManager.startServer();
	});

	// Register commands for opening different AI services
	let openGeminiDisposable = vscode.commands.registerCommand('the-parsian.openGemini', () => {
		connectionManager.openAIService('gemini');
	});

	let openChatGPTDisposable = vscode.commands.registerCommand('the-parsian.openChatGPT', () => {
		connectionManager.openAIService('chatgpt');
	});

	let openDeepSeekDisposable = vscode.commands.registerCommand('the-parsian.openDeepSeek', () => {
		connectionManager.openAIService('deepseek');
	});

	// Register the chat panel command
	let chatDisposable = vscode.commands.registerCommand('the-parsian.openChat', () => {
		const server = connectionManager.getServer();
		if (server) {
			ChatPanelProvider.createOrShow(context.extensionUri, server);
		} else {
			vscode.window.showErrorMessage('The Parsian: Server not started. Please connect first.');
		}
	});
	
	// Register refactor command
	let refactorDisposable = vscode.commands.registerCommand('the-parsian.refactor', async () => {
		const selection = vscode.window.activeTextEditor?.selection;
		if (selection) {
			const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
			if (selectedText) {
				await commandHandler.handleRefactorCommand(`refactor the following code: ${selectedText}`);
			}
		}
	});
	
	// Register fix bug command
	let fixBugDisposable = vscode.commands.registerCommand('the-parsian.fixBug', async () => {
		const selection = vscode.window.activeTextEditor?.selection;
		if (selection) {
			const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
			if (selectedText) {
				await commandHandler.handleRefactorCommand(`fix any bugs in the following code: ${selectedText}`);
			}
		}
	});

	// Register the inline completion provider
	const inlineCompletionProvider = new InlineCompletionProvider();
	const inlineCompletionDisposable = vscode.languages.registerInlineCompletionItemProvider(
		{ pattern: '**' },
		inlineCompletionProvider
	);

	context.subscriptions.push(connectDisposable);
	context.subscriptions.push(chatDisposable);
	context.subscriptions.push(inlineCompletionDisposable);
	context.subscriptions.push(openGeminiDisposable);
	context.subscriptions.push(openChatGPTDisposable);
	context.subscriptions.push(openDeepSeekDisposable);
	context.subscriptions.push(refactorDisposable);
	context.subscriptions.push(fixBugDisposable);
}

export function deactivate() {
	if (connectionManager) {
		connectionManager.dispose();
	}
}