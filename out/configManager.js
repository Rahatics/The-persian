"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = require("vscode");
class ConfigManager {
    // Get a configuration value
    static get(key, defaultValue) {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get(key, defaultValue);
    }
    // Update a configuration value
    static async update(key, value, target = vscode.ConfigurationTarget.Global) {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(key, value, target);
    }
    // Get auto-approval settings
    static getAutoApprovalSettings() {
        return {
            enabled: this.get('autoApprove.enabled', false),
            allowMediumConfidence: this.get('autoApprove.allowMediumConfidence', false),
            allowAllCommands: this.get('autoApprove.allowAllCommands', false)
        };
    }
    // Get security settings
    static getSecuritySettings() {
        return {
            sanitizeHtml: this.get('security.sanitizeHtml', true),
            maskSensitiveInfo: this.get('security.maskSensitiveInfo', true),
            validateJson: this.get('security.validateJson', true)
        };
    }
    // Get RAG settings
    static getRagSettings() {
        return {
            enabled: this.get('rag.enabled', true),
            maxContextTokens: this.get('rag.maxContextTokens', 3000),
            indexIgnorePatterns: this.get('rag.indexIgnorePatterns', [
                '.git',
                'node_modules',
                'dist',
                'build'
            ])
        };
    }
    // Get UI settings
    static getUiSettings() {
        return {
            showInlineSuggestions: this.get('ui.showInlineSuggestions', true),
            showStatusBarItem: this.get('ui.showStatusBarItem', true),
            chatPanelPosition: this.get('ui.chatPanelPosition', 'right')
        };
    }
    // Get connection settings
    static getConnectionSettings() {
        return {
            autoReconnect: this.get('connection.autoReconnect', true),
            maxReconnectAttempts: this.get('connection.maxReconnectAttempts', 5),
            reconnectDelay: this.get('connection.reconnectDelay', 3000)
        };
    }
    // Get all settings
    static getAllSettings() {
        return {
            autoApproval: this.getAutoApprovalSettings(),
            security: this.getSecuritySettings(),
            rag: this.getRagSettings(),
            ui: this.getUiSettings(),
            connection: this.getConnectionSettings()
        };
    }
    // Listen for configuration changes
    static onDidChangeConfiguration(listener, thisArg) {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(this.CONFIG_SECTION)) {
                listener.call(thisArg, event);
            }
        });
    }
}
exports.ConfigManager = ConfigManager;
ConfigManager.CONFIG_SECTION = 'theParsian';
//# sourceMappingURL=configManager.js.map