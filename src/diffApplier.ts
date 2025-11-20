import * as vscode from 'vscode';

export class DiffApplier {
    /**
     * Apply a code change to the active editor
     * @param newCode The new code to apply
     * @param language The language of the code (optional)
     */
    static async applyCodeChange(newCode: string, _language?: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        // Create a new document with the proposed changes
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.replace(document.uri, fullRange, newCode);
        
        // Apply the edit
        try {
            await vscode.workspace.applyEdit(workspaceEdit);
            vscode.window.showInformationMessage('Code changes applied successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply code changes: ${error}`);
        }
    }

    /**
     * Show a diff view between the current document and proposed changes
     * @param newCode The new code to compare with
     * @param language The language of the code (optional)
     */
    static async showDiff(newCode: string, _language?: string): Promise<void> {
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
        const tempUri = document.uri.with({ scheme: 'untitled', path: `${document.fileName}.proposed` });
        const tempDocument = await vscode.workspace.openTextDocument(tempUri);
        
        // Set the content of the temporary document
        const edit = new vscode.WorkspaceEdit();
        edit.insert(tempUri, new vscode.Position(0, 0), newCode);
        await vscode.workspace.applyEdit(edit);
        
        // Show the diff view
        await vscode.commands.executeCommand(
            'vscode.diff',
            document.uri,
            tempUri,
            `${document.fileName} ↔ Proposed Changes`,
            { 
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: true
            }
        );
        
        // Show information message
        vscode.window.showInformationMessage('Diff view opened. Review changes and click "Apply Changes" when ready.');
    }

    /**
     * Apply a partial change to a specific range in the document
     * @param range The range to apply the change to
     * @param newContent The new content for the range
     */
    static async applyPartialChange(range: vscode.Range, newContent: string): Promise<void> {
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply partial changes: ${error}`);
        }
    }

    /**
     * Create a range from line numbers
     * @param startLine The starting line (0-based)
     * @param endLine The ending line (0-based, exclusive)
     */
    static createRange(startLine: number, endLine: number): vscode.Range {
        return new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, 0)
        );
    }
    
    /**
     * Apply changes with user confirmation
     * @param newCode The new code to apply
     * @param language The language of the code (optional)
     */
    static async applyWithConfirmation(newCode: string, language?: string): Promise<void> {
        const choice = await vscode.window.showInformationMessage(
            'Apply the proposed changes to your code?',
            'Show Diff', 'Apply Changes', 'Cancel'
        );
        
        switch (choice) {
            case 'Show Diff':
                await this.showDiff(newCode, language);
                break;
            case 'Apply Changes':
                await this.applyCodeChange(newCode, language);
                break;
            default:
                // User cancelled
                break;
        }
    }
    
    /**
     * Apply selected code from a larger code block
     * @param fullCode The full code block received from AI
     * @param selectedCode The specific code to apply
     */
    static async applySelectedCode(fullCode: string, selectedCode: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        
        // If selected code is the same as full code, apply the full code
        if (fullCode.trim() === selectedCode.trim()) {
            await this.applyCodeChange(fullCode);
            return;
        }
        
        // Show diff view for the selected code
        await this.showDiff(selectedCode);
    }
}