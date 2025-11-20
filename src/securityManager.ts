import * as vscode from 'vscode';

export class SecurityManager {
    // Blacklisted commands that should never be auto-approved
    private static readonly BLACKLISTED_COMMANDS: RegExp[] = [
        /rm\s+-rf/,
        /format/,
        /sudo/,
        /del\s+\/s/,
        /rmdir\s+\/s/,
        /erase/,
        /chmod\s+777/,
        /chown\s+root/,
        /mkfs/,
        /dd\s+if=/,
        /iptables\s+-F/,
        /systemctl\s+(halt|poweroff|reboot)/
    ];

    // Whitelisted commands that can be auto-approved (if user settings allow)
    private static readonly WHITELISTED_COMMANDS: RegExp[] = [
        /npm\s+install/,
        /git\s+status/,
        /ls/,
        /dir/,
        /pwd/,
        /echo/,
        /cat/,
        /grep/,
        /find/,
        /node\s+--version/,
        /npm\s+--version/,
        /git\s+--version/,
        /tsc/,
        /eslint/,
        /webpack/,
        /jest/,
        /mocha/,
        /npm\s+test/,
        /npm\s+run\s+\w+/
    ];

    // Sanitize HTML content to prevent XSS
    static sanitizeHTML(html: string): string {
        // Remove all HTML tags
        return html.replace(/<[^>]*>/g, '');
    }

    // Check if a command is blacklisted
    static isCommandBlacklisted(command: string): boolean {
        return this.BLACKLISTED_COMMANDS.some(regex => regex.test(command));
    }

    // Check if a command is whitelisted
    static isCommandWhitelisted(command: string): boolean {
        return this.WHITELISTED_COMMANDS.some(regex => regex.test(command));
    }

    // Validate file path to prevent directory traversal
    static isValidPath(filePath: string): boolean {
        // Check for directory traversal attempts
        if (filePath.includes('../') || filePath.includes('..\\')) {
            return false;
        }

        // Check for absolute paths (platform-specific)
        if (process.platform === 'win32') {
            // Windows absolute path patterns
            if (/^[a-zA-Z]:\\/.test(filePath) || /^\\\\/.test(filePath)) {
                return false;
            }
        } else {
            // Unix-like absolute path
            if (filePath.startsWith('/')) {
                return false;
            }
        }

        return true;
    }

    // Mask sensitive information in code
    static maskSensitiveInfo(code: string): string {
        // Mask common sensitive patterns
        return code
            .replace(/(password|passwd|pwd)['"]?\s*[:=]\s*['"][^'"]*['"]/gi, '$1: "***"')
            .replace(/(api[key|secret])['"]?\s*[:=]\s*['"][^'"]*['"]/gi, '$1: "***"')
            .replace(/(token)['"]?\s*[:=]\s*['"][^'"]*['"]/gi, '$1: "***"')
            .replace(/(secret)['"]?\s*[:=]\s*['"][^'"]*['"]/gi, '$1: "***"');
    }

    // Check if auto-approval is allowed for a command
    static isAutoApprovalAllowed(command: string, confidence: 'high' | 'medium' | 'low', userSettings: any): boolean {
        // Never auto-approve blacklisted commands
        if (this.isCommandBlacklisted(command)) {
            return false;
        }

        // Always require confirmation for low confidence
        if (confidence === 'low') {
            return false;
        }

        // Check user settings for auto-approval
        if (!userSettings.autoApprove) {
            return false;
        }

        // For medium confidence, only auto-approve if explicitly allowed
        if (confidence === 'medium' && !userSettings.autoApproveMedium) {
            return false;
        }

        // For high confidence, auto-approve if command is whitelisted or user allows all
        if (confidence === 'high') {
            return this.isCommandWhitelisted(command) || userSettings.autoApproveAll;
        }

        return false;
    }

    // Check if auto-approval is allowed for code changes
    static isCodeAutoApprovalAllowed(code: string, confidence: 'high' | 'medium' | 'low', userSettings: any): boolean {
        // Check for dangerous patterns in code
        const dangerCheck = this.checkCodeForDangers(code);
        if (dangerCheck.isDangerous) {
            return false;
        }

        // Always require confirmation for low confidence
        if (confidence === 'low') {
            return false;
        }

        // Check user settings for auto-approval
        if (!userSettings.autoApprove) {
            return false;
        }

        // For medium confidence, only auto-approve if explicitly allowed
        if (confidence === 'medium' && !userSettings.autoApproveMedium) {
            return false;
        }

        // For high confidence, auto-approve if user allows all
        if (confidence === 'high') {
            return userSettings.autoApproveAll;
        }

        return false;
    }

    // Show security alert to user
    static async showSecurityAlert(command: string): Promise<boolean> {
        const result = await vscode.window.showWarningMessage(
            `Security Alert: AI wants to execute command: "${command}"`,
            { modal: true },
            'Allow',
            'Deny'
        );

        return result === 'Allow';
    }

    // Validate JSON response from AI
    static validateJSONResponse(response: string): boolean {
        try {
            JSON.parse(response);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Sanitize file content
    static sanitizeFileContent(content: string): string {
        // Remove null bytes which can be used in exploits
        return content.replace(/\0/g, '');
    }

    // Check code for potentially dangerous patterns
    static checkCodeForDangers(code: string): { isDangerous: boolean; reasons: string[] } {
        const dangers: string[] = [];
        
        // Check for dangerous patterns
        if (/require\s*\(\s*['"]child_process['"]\s*\)/.test(code)) {
            dangers.push('Use of child_process module');
        }
        
        if (/exec\s*\(\s*['"`][^'"]*['"`]/.test(code)) {
            dangers.push('Use of exec function');
        }
        
        if (/eval\s*\(\s*['"`][^'"]*['"`]/.test(code)) {
            dangers.push('Use of eval function');
        }
        
        if (/fs\.writeFileSync|fs\.writeFile/.test(code)) {
            dangers.push('File write operation detected');
        }
        
        if (/process\.env/.test(code)) {
            dangers.push('Environment variable access');
        }
        
        if (/\.\./.test(code) && /\/(\.\.\/)+/.test(code)) {
            dangers.push('Directory traversal pattern');
        }
        
        return {
            isDangerous: dangers.length > 0,
            reasons: dangers
        };
    }

    // Generate a security report for code
    static generateSecurityReport(code: string): string {
        const dangerCheck = this.checkCodeForDangers(code);
        
        if (!dangerCheck.isDangerous) {
            return '✓ No security issues detected';
        }
        
        return `⚠ Security issues detected:\n${dangerCheck.reasons.map(reason => `  - ${reason}`).join('\n')}`;
    }
}