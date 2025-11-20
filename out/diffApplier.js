"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffApplier = void 0;
const vscode = require("vscode");
class DiffApplier {
    /**
     * Apply a code change to the active editor
     * @param newCode The new code to apply
     * @param language The language of the code (optional)
     */
    static async applyCodeChange(newCode, _language) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const document = editor.document;
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        // Create a new document with the proposed changes
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.replace(document.uri, fullRange, newCode);
        // Apply the edit
        try {
            await vscode.workspace.applyEdit(workspaceEdit);
            vscode.window.showInformationMessage('Code changes applied successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to apply code changes: ${error}`);
        }
    }
    /**
     * Show a diff view between the current document and proposed changes
     * @param newCode The new code to compare with
     * @param language The language of the code (optional)
     */
    static async showDiff(newCode, _language) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const document = editor.document;
        const currentCode = document.getText();
        // If the code is the same, no need to show diff
        if (currentCode === newCode) {
            vscode.window.showInformationMessage('No changes to apply');
            return;
        }
        // Create a temporary document with the new code
        const tempUri = document.uri.with({ scheme: 'untitled', path: `${document.fileName}.diff` });
        const tempDocument = await vscode.workspace.openTextDocument(tempUri);
        // Set the content of the temporary document
        const edit = new vscode.WorkspaceEdit();
        edit.insert(tempUri, new vscode.Position(0, 0), newCode);
        await vscode.workspace.applyEdit(edit);
        // Show the diff view
        await vscode.commands.executeCommand('vscode.diff', document.uri, tempUri, `${document.fileName} ↔ Proposed Changes`, { viewColumn: vscode.ViewColumn.One });
    }
    /**
     * Apply a partial change to a specific range in the document
     * @param range The range to apply the change to
     * @param newContent The new content for the range
     */
    static async applyPartialChange(range, newContent) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.replace(editor.document.uri, range, newContent);
        try {
            await vscode.workspace.applyEdit(workspaceEdit);
            vscode.window.showInformationMessage('Partial changes applied successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to apply partial changes: ${error}`);
        }
    }
    /**
     * Create a range from line numbers
     * @param startLine The starting line (0-based)
     * @param endLine The ending line (0-based, exclusive)
     */
    static createRange(startLine, endLine) {
        return new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, 0));
    }
}
exports.DiffApplier = DiffApplier;
//# sourceMappingURL=diffApplier.js.map