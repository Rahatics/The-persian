import * as vscode from 'vscode';

export class NotificationManager {
    // Show an information message
    static showInfo(message: string, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showInformationMessage(`The Parsian: ${message}`, ...items);
    }

    // Show a warning message
    static showWarning(message: string, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showWarningMessage(`The Parsian: ${message}`, ...items);
    }

    // Show an error message
    static showError(message: string, ...items: string[]): Thenable<string | undefined> {
        return vscode.window.showErrorMessage(`The Parsian: ${message}`, ...items);
    }

    // Show a progress notification
    static async showProgress<T>(title: string, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<T>): Promise<T> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `The Parsian: ${title}`,
            cancellable: false
        }, task);
    }

    // Show a status bar message temporarily
    static showStatusBarMessage(message: string, hideAfterTimeout?: number): vscode.Disposable {
        if (hideAfterTimeout !== undefined) {
            return vscode.window.setStatusBarMessage(`The Parsian: ${message}`, hideAfterTimeout);
        } else {
            return vscode.window.setStatusBarMessage(`The Parsian: ${message}`);
        }
    }

    // Show an input box for user input
    static async showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined> {
        const defaultOptions: vscode.InputBoxOptions = {
            title: 'The Parsian',
            prompt: 'Enter your input',
            ignoreFocusOut: true
        };

        return vscode.window.showInputBox({ ...defaultOptions, ...options });
    }

    // Show a quick pick menu
    static async showQuickPick<T extends vscode.QuickPickItem>(items: T[], options?: vscode.QuickPickOptions): Promise<T | undefined> {
        const defaultOptions: vscode.QuickPickOptions = {
            title: 'The Parsian',
            placeHolder: 'Select an option',
            ignoreFocusOut: true
        };

        return vscode.window.showQuickPick(items, { ...defaultOptions, ...options });
    }

    // Show a modal dialog with custom buttons
    static async showModal(message: string, detail: string, ...buttons: string[]): Promise<string | undefined> {
        const result = await vscode.window.showInformationMessage(
            `The Parsian: ${message}`,
            { modal: true, detail },
            ...buttons
        );
        return result;
    }

    // Show a notification with actions
    static async showActionNotification(message: string, ...actions: { title: string; action: () => void }[]): Promise<void> {
        const actionTitles = actions.map(a => a.title);
        const selected = await vscode.window.showInformationMessage(`The Parsian: ${message}`, ...actionTitles);
        
        if (selected) {
            const action = actions.find(a => a.title === selected);
            if (action) {
                action.action();
            }
        }
    }

    // Show a notification with a link
    static async showLinkNotification(message: string, linkText: string, linkUrl: string): Promise<void> {
        const selected = await vscode.window.showInformationMessage(
            `The Parsian: ${message}`,
            linkText
        );
        
        if (selected === linkText) {
            vscode.env.openExternal(vscode.Uri.parse(linkUrl));
        }
    }

    // Show a toast notification (non-modal)
    static showToast(message: string, duration: number = 5000): void {
        const disposable = vscode.window.setStatusBarMessage(`The Parsian: ${message}`);
        
        // Hide the message after the specified duration
        setTimeout(() => {
            disposable.dispose();
        }, duration);
    }

    // Show a persistent notification in the status bar
    static showPersistentStatus(message: string, alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Left, priority?: number): vscode.StatusBarItem {
        const item = vscode.window.createStatusBarItem(alignment, priority);
        item.text = `The Parsian: ${message}`;
        item.show();
        return item;
    }
}