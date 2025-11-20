import * as vscode from 'vscode';

export class ConfigManager {
    private static readonly CONFIG_SECTION = 'theParsian';
    
    // Get a configuration value
    static get<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<T>(key, defaultValue) as T;
    }
    
    // Update a configuration value
    static async update(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(key, value, target);
    }
    
    // Get auto-approval settings
    static getAutoApprovalSettings(): AutoApprovalSettings {
        return {
            enabled: this.get<boolean>('autoApprove.enabled', false),
            allowMediumConfidence: this.get<boolean>('autoApprove.allowMediumConfidence', false),
            allowAllCommands: this.get<boolean>('autoApprove.allowAllCommands', false)
        };
    }
    
    // Get security settings
    static getSecuritySettings(): SecuritySettings {
        return {
            sanitizeHtml: this.get<boolean>('security.sanitizeHtml', true),
            maskSensitiveInfo: this.get<boolean>('security.maskSensitiveInfo', true),
            validateJson: this.get<boolean>('security.validateJson', true)
        };
    }
    
    // Get RAG settings
    static getRagSettings(): RagSettings {
        return {
            enabled: this.get<boolean>('rag.enabled', true),
            maxContextTokens: this.get<number>('rag.maxContextTokens', 3000),
            indexIgnorePatterns: this.get<string[]>('rag.indexIgnorePatterns', [
                '.git',
                'node_modules',
                'dist',
                'build'
            ])
        };
    }
    
    // Get UI settings
    static getUiSettings(): UiSettings {
        return {
            showInlineSuggestions: this.get<boolean>('ui.showInlineSuggestions', true),
            showStatusBarItem: this.get<boolean>('ui.showStatusBarItem', true),
            chatPanelPosition: this.get<string>('ui.chatPanelPosition', 'right')
        };
    }
    
    // Get connection settings
    static getConnectionSettings(): ConnectionSettings {
        return {
            autoReconnect: this.get<boolean>('connection.autoReconnect', true),
            maxReconnectAttempts: this.get<number>('connection.maxReconnectAttempts', 5),
            reconnectDelay: this.get<number>('connection.reconnectDelay', 3000)
        };
    }
    
    // Get all settings
    static getAllSettings(): AllSettings {
        return {
            autoApproval: this.getAutoApprovalSettings(),
            security: this.getSecuritySettings(),
            rag: this.getRagSettings(),
            ui: this.getUiSettings(),
            connection: this.getConnectionSettings()
        };
    }
    
    // Listen for configuration changes
    static onDidChangeConfiguration(listener: (event: vscode.ConfigurationChangeEvent) => any, thisArg?: any): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(this.CONFIG_SECTION)) {
                listener.call(thisArg, event);
            }
        });
    }
}

// Type definitions
interface AutoApprovalSettings {
    enabled: boolean;
    allowMediumConfidence: boolean;
    allowAllCommands: boolean;
}

interface SecuritySettings {
    sanitizeHtml: boolean;
    maskSensitiveInfo: boolean;
    validateJson: boolean;
}

interface RagSettings {
    enabled: boolean;
    maxContextTokens: number;
    indexIgnorePatterns: string[];
}

interface UiSettings {
    showInlineSuggestions: boolean;
    showStatusBarItem: boolean;
    chatPanelPosition: string;
}

interface ConnectionSettings {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectDelay: number;
}

interface AllSettings {
    autoApproval: AutoApprovalSettings;
    security: SecuritySettings;
    rag: RagSettings;
    ui: UiSettings;
    connection: ConnectionSettings;
}