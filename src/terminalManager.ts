import * as vscode from 'vscode';
import { SecurityManager } from './securityManager';
import { ConfigManager } from './configManager';

export class TerminalManager {
    private static terminal: vscode.Terminal | null = null;
    private static commandQueue: QueuedCommand[] = [];
    private static isProcessing: boolean = false;

    // Create or get the terminal
    private static getTerminal(): vscode.Terminal {
        if (!this.terminal) {
            this.terminal = vscode.window.createTerminal('The Parsian');
        }
        return this.terminal;
    }

    // Execute a command in the terminal
    static async executeCommand(command: string, options?: CommandOptions): Promise<CommandResult> {
        // Sanitize command
        const sanitizedCommand = SecurityManager.sanitizeHTML(command);

        // Check if command is blacklisted
        if (SecurityManager.isCommandBlacklisted(sanitizedCommand)) {
            return {
                success: false,
                error: `Command is blacklisted for security reasons: ${sanitizedCommand}`
            };
        }

        // Get auto-approval settings
        const autoApprovalSettings = ConfigManager.getAutoApprovalSettings();

        // Check if auto-approval is allowed
        let approved = false;
        if (options?.confidence && autoApprovalSettings.enabled) {
            approved = SecurityManager.isAutoApprovalAllowed(
                sanitizedCommand,
                options.confidence,
                autoApprovalSettings
            );
        }

        // If not auto-approved, show security alert
        if (!approved) {
            const userApproved = await SecurityManager.showSecurityAlert(sanitizedCommand);
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
        } catch (error) {
            console.error('Failed to execute command:', error);
            return {
                success: false,
                error: `Failed to execute command: ${error}`,
                command: sanitizedCommand
            };
        }
    }

    // Execute a command and capture output
    static async executeCommandWithOutput(command: string, _timeout: number = 30000): Promise<CommandResult> {
        // This is a simplified implementation
        // In a real scenario, you would need to capture the terminal output
        // which is not directly possible with VS Code's API

        // Sanitize command
        const sanitizedCommand = SecurityManager.sanitizeHTML(command);

        // Check if command is blacklisted
        if (SecurityManager.isCommandBlacklisted(sanitizedCommand)) {
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
        } catch (error) {
            console.error('Failed to execute command:', error);
            return {
                success: false,
                error: `Failed to execute command: ${error}`,
                command: sanitizedCommand
            };
        }
    }

    // Queue a command for execution
    static queueCommand(command: string, options?: CommandOptions): void {
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
    private static async processQueue(): Promise<void> {
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
    static clearQueue(): void {
        this.commandQueue = [];
    }

    // Get queue size
    static getQueueSize(): number {
        return this.commandQueue.length;
    }

    // Dispose of the terminal
    static dispose(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
        this.commandQueue = [];
        this.isProcessing = false;
    }
}

// Type definitions
interface CommandOptions {
    confidence?: 'high' | 'medium' | 'low';
    showTerminal?: boolean;
    waitForCompletion?: boolean;
}

interface CommandResult {
    success: boolean;
    command?: string;
    output?: string;
    error?: string;
}

interface QueuedCommand {
    command: string;
    options?: CommandOptions;
    timestamp: number;
}