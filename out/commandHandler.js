"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandler = void 0;
const vscode = require("vscode");
const diffApplier_1 = require("./diffApplier");
const contextManager_1 = require("./contextManager");
class CommandHandler {
    constructor() {
        this.contextManager = new contextManager_1.ContextManager();
    }
    /**
     * Handle a refactor command
     * @param command The refactor command (e.g., "refactor this", "fix bug")
     */
    async handleRefactorCommand(command) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        // Get the selected text or the entire document
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        // Get context for the command
        const filePath = editor.document.fileName;
        const context = await this.contextManager.getContextForQuery(command, filePath);
        // Create a more specific prompt for the AI
        const prompt = `Please ${command} for the following code:
        
${selectedText || 'the entire file'}

Context:
- File: ${filePath}
- Language: ${editor.document.languageId}

Please provide only the refactored code without any explanations.`;
        // In a real implementation, this would send the prompt to the AI service
        // For now, we'll show a message
        vscode.window.showInformationMessage(`Command sent: ${command}`);
    }
    /**
     * Handle a code generation command
     * @param description Description of what code to generate
     */
    async handleGenerateCode(description) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        // Get context for the command
        const filePath = editor.document.fileName;
        const context = await this.contextManager.getContextForQuery(description, filePath);
        // Create a prompt for the AI
        const prompt = `Please generate ${description}.
        
Context:
- Current file: ${filePath}
- Language: ${editor.document.languageId}
- Project structure: ${Object.keys(context.relevantFiles).join(', ')}`;
        // In a real implementation, this would send the prompt to the AI service
        // For now, we'll show a message
        vscode.window.showInformationMessage(`Code generation request sent: ${description}`);
    }
    /**
     * Apply code changes from AI response
     * @param code The code to apply
     * @param language The language of the code
     */
    async applyCodeChanges(code, language) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        // Show diff view and let user decide
        await diffApplier_1.DiffApplier.applyWithConfirmation(code, language);
    }
    /**
     * Handle a test generation command
     * @param functionCode The function to generate tests for
     */
    async handleGenerateTests(functionCode) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        // Get context for the command
        const filePath = editor.document.fileName;
        const context = await this.contextManager.getContextForQuery('generate tests', filePath);
        // Create a prompt for the AI
        const prompt = `Please generate unit tests for the following function:
        
${functionCode}

Context:
- File: ${filePath}
- Language: ${editor.document.languageId}
- Related files: ${Object.keys(context.relevantFiles).join(', ')}`;
        // In a real implementation, this would send the prompt to the AI service
        // For now, we'll show a message
        vscode.window.showInformationMessage('Test generation request sent');
    }
}
exports.CommandHandler = CommandHandler;
//# sourceMappingURL=commandHandler.js.map