"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationManager = void 0;
const vscode = require("vscode");
class NotificationManager {
    // Show an information message
    static showInfo(message, ...items) {
        return vscode.window.showInformationMessage(`The Parsian: ${message}`, ...items);
    }
    // Show a warning message
    static showWarning(message, ...items) {
        return vscode.window.showWarningMessage(`The Parsian: ${message}`, ...items);
    }
    // Show an error message
    static showError(message, ...items) {
        return vscode.window.showErrorMessage(`The Parsian: ${message}`, ...items);
    }
    // Show a progress notification
    static async showProgress(title, task) {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `The Parsian: ${title}`,
            cancellable: false
        }, task);
    }
    // Show a status bar message temporarily
    static showStatusBarMessage(message, hideAfterTimeout) {
        if (hideAfterTimeout !== undefined) {
            return vscode.window.setStatusBarMessage(`The Parsian: ${message}`, hideAfterTimeout);
        }
        else {
            return vscode.window.setStatusBarMessage(`The Parsian: ${message}`);
        }
    }
    // Show an input box for user input
    static async showInputBox(options) {
        const defaultOptions = {
            title: 'The Parsian',
            prompt: 'Enter your input',
            ignoreFocusOut: true
        };
        return vscode.window.showInputBox({ ...defaultOptions, ...options });
    }
    // Show a quick pick menu
    static async showQuickPick(items, options) {
        const defaultOptions = {
            title: 'The Parsian',
            placeHolder: 'Select an option',
            ignoreFocusOut: true
        };
        return vscode.window.showQuickPick(items, { ...defaultOptions, ...options });
    }
    // Show a modal dialog with custom buttons
    static async showModal(message, detail, ...buttons) {
        const result = await vscode.window.showInformationMessage(`The Parsian: ${message}`, { modal: true, detail }, ...buttons);
        return result;
    }
    // Show a notification with actions
    static async showActionNotification(message, ...actions) {
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
    static async showLinkNotification(message, linkText, linkUrl) {
        const selected = await vscode.window.showInformationMessage(`The Parsian: ${message}`, linkText);
        if (selected === linkText) {
            vscode.env.openExternal(vscode.Uri.parse(linkUrl));
        }
    }
    // Show a toast notification (non-modal)
    static showToast(message, duration = 5000) {
        const disposable = vscode.window.setStatusBarMessage(`The Parsian: ${message}`);
        // Hide the message after the specified duration
        setTimeout(() => {
            disposable.dispose();
        }, duration);
    }
    // Show a persistent notification in the status bar
    static showPersistentStatus(message, alignment = vscode.StatusBarAlignment.Left, priority) {
        const item = vscode.window.createStatusBarItem(alignment, priority);
        item.text = `The Parsian: ${message}`;
        item.show();
        return item;
    }
}
exports.NotificationManager = NotificationManager;
//# sourceMappingURL=notificationManager.js.map