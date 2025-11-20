"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolManager = void 0;
const uuid_1 = require("uuid");
class ProtocolManager {
    // Create a request message
    static createRequest(actionType, userQuery, context) {
        return {
            id: (0, uuid_1.v4)(),
            system_role: 'STRICT_JSON_ONLY_MODE',
            action_type: actionType,
            context: context || {},
            user_query: userQuery
        };
    }
    // Create a response message
    static createResponse(requestId, status, data, security) {
        return {
            request_id: requestId,
            status: status,
            data: data || { content: '' },
            security: security || {
                requires_confirmation: false,
                confidence: 'high'
            }
        };
    }
    // Create an error response
    static createErrorResponse(requestId, message) {
        return {
            request_id: requestId,
            status: 'error',
            data: {
                content: message
            },
            security: {
                requires_confirmation: false,
                confidence: 'high'
            }
        };
    }
    // Validate a request message
    static validateRequest(request) {
        return (typeof request === 'object' &&
            typeof request.id === 'string' &&
            request.system_role === 'STRICT_JSON_ONLY_MODE' &&
            (request.action_type === 'CODE_SUGGEST' ||
                request.action_type === 'EXPLAIN' ||
                request.action_type === 'RUN_COMMAND') &&
            typeof request.user_query === 'string');
    }
    // Validate a response message
    static validateResponse(response) {
        return (typeof response === 'object' &&
            typeof response.request_id === 'string' &&
            (response.status === 'success' || response.status === 'error') &&
            typeof response.data === 'object');
    }
    // Parse a message from string
    static parseMessage(message) {
        try {
            const parsed = JSON.parse(message);
            // Try to determine if it's a request or response
            if (this.validateRequest(parsed)) {
                return parsed;
            }
            else if (this.validateResponse(parsed)) {
                return parsed;
            }
            else {
                return null;
            }
        }
        catch (error) {
            console.error('Failed to parse message:', error);
            return null;
        }
    }
    // Stringify a message
    static stringifyMessage(message) {
        return JSON.stringify(message);
    }
    // Create a code suggestion request
    static createCodeSuggestionRequest(query, context) {
        return this.createRequest('CODE_SUGGEST', query, context);
    }
    // Create an explanation request
    static createExplanationRequest(query, context) {
        return this.createRequest('EXPLAIN', query, context);
    }
    // Create a command request
    static createCommandRequest(query, context) {
        return this.createRequest('RUN_COMMAND', query, context);
    }
    // Create a success response with code content
    static createCodeResponse(requestId, code, language = 'javascript', confidence = 'high') {
        return this.createResponse(requestId, 'success', {
            content: code,
            language: language
        }, {
            requires_confirmation: false,
            confidence: confidence
        });
    }
    // Create a success response with text content
    static createTextResponse(requestId, text, confidence = 'high') {
        return this.createResponse(requestId, 'success', {
            content: text,
            language: 'text'
        }, {
            requires_confirmation: false,
            confidence: confidence
        });
    }
    // Create a command response
    static createCommandResponse(requestId, commandOutput, requiresConfirmation = true, confidence = 'medium') {
        return this.createResponse(requestId, 'success', {
            content: commandOutput,
            language: 'bash'
        }, {
            requires_confirmation: requiresConfirmation,
            confidence: confidence
        });
    }
}
exports.ProtocolManager = ProtocolManager;
//# sourceMappingURL=protocolManager.js.map