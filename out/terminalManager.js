"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalManager = void 0;
const vscode = require("vscode");
const securityManager_1 = require("./securityManager");
const configManager_1 = require("./configManager");
class TerminalManager {
    // Create or get the terminal
    static getTerminal() {
        if (!this.terminal) {
            this.terminal = vscode.window.createTerminal('The Parsian');
        }
        return this.terminal;
    }
    // Execute a command in the terminal
    static async executeCommand(command, options) {
        // Sanitize command
        const sanitizedCommand = securityManager_1.SecurityManager.sanitizeHTML(command);
        // Check if command is blacklisted
        if (securityManager_1.SecurityManager.isCommandBlacklisted(sanitizedCommand)) {
            return {
                success: false,
                error: `Command is blacklisted for security reasons: ${sanitizedCommand}`
            };
        }
        // Get auto-approval settings
        const autoApprovalSettings = configManager_1.ConfigManager.getAutoApprovalSettings();
        // Check if auto-approval is allowed
        let approved = false;
        if (options?.confidence && autoApprovalSettings.enabled) {
            approved = securityManager_1.SecurityManager.isAutoApprovalAllowed(sanitizedCommand, options.confidence, autoApprovalSettings);
        }
        // If not auto-approved, show security alert
        if (!approved) {
            const userApproved = await securityManager_1.SecurityManager.showSecurityAlert(sanitizedCommand);
            if (!userApproved) {
                return {
                    success: false,
                    error: 'Command execution denied by user'
                };
            }
            approved = true;
        }
        try {
            // Get or create terminal
            const terminal = this.getTerminal();
            // Show terminal if requested
            if (options?.showTerminal) {
                terminal.show();
            }
            // Execute command
            terminal.sendText(sanitizedCommand, true);
            return {
                success: true,
                command: sanitizedCommand
            };
        }
        catch (error) {
            console.error('Failed to execute command:', error);
            return {
                success: false,
                error: `Failed to execute command: ${error}`,
                command: sanitizedCommand
            };
        }
    }
    // Execute a command and capture output
    static async executeCommandWithOutput(command, _timeout = 30000) {
        // This is a simplified implementation
        // In a real scenario, you would need to capture the terminal output
        // which is not directly possible with VS Code's API
        // Sanitize command
        const sanitizedCommand = securityManager_1.SecurityManager.sanitizeHTML(command);
        // Check if command is blacklisted
        if (securityManager_1.SecurityManager.isCommandBlacklisted(sanitizedCommand)) {
            return {
                success: false,
                error: `Command is blacklisted for security reasons: ${sanitizedCommand}`
            };
        }
        try {
            // Get or create terminal
            const terminal = this.getTerminal();
            // Execute command
            terminal.sendText(sanitizedCommand, true);
            // Return success without output (since we can't capture it easily)
            return {
                success: true,
                command: sanitizedCommand,
                output: 'Command executed. Check terminal for output.'
            };
        }
        catch (error) {
            console.error('Failed to execute command:', error);
            return {
                success: false,
                error: `Failed to execute command: ${error}`,
                command: sanitizedCommand
            };
        }
    }
    // Queue a command for execution
    static queueCommand(command, options) {
        this.commandQueue.push({
            command,
            options,
            timestamp: Date.now()
        });
        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    // Process the command queue
    static async processQueue() {
        if (this.commandQueue.length === 0) {
            this.isProcessing = false;
            return;
        }
        this.isProcessing = true;
        // Get next command from queue
        const queuedCommand = this.commandQueue.shift();
        if (!queuedCommand) {
            this.isProcessing = false;
            return;
        }
        // Execute command
        await this.executeCommand(queuedCommand.command, queuedCommand.options);
        // Continue processing queue
        setTimeout(() => {
            this.processQueue();
        }, 100); // Small delay between commands
    }
    // Clear the command queue
    static clearQueue() {
        this.commandQueue = [];
    }
    // Get queue size
    static getQueueSize() {
        return this.commandQueue.length;
    }
    // Dispose of the terminal
    static dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
        this.commandQueue = [];
        this.isProcessing = false;
    }
}
exports.TerminalManager = TerminalManager;
TerminalManager.terminal = null;
TerminalManager.commandQueue = [];
TerminalManager.isProcessing = false;
//# sourceMappingURL=terminalManager.js.map