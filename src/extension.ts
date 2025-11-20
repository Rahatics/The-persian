import * as vscode from 'vscode';
import { ChatPanelProvider } from './chatPanelProvider';
import { InlineCompletionProvider } from './inlineCompletionProvider';
import { ConnectionManager } from './connectionManager';

let connectionManager: ConnectionManager;

export function activate(context: vscode.ExtensionContext) {
	console.log('The Parsian AI Developer Agent is now active!');

	// Create connection manager
	connectionManager = new ConnectionManager();

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
}

export function deactivate() {
	if (connectionManager) {
		connectionManager.dispose();
	}
}