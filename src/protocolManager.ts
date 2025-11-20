import { v4 as uuidv4 } from 'uuid';
import { ParsianRequest, ParsianResponse } from './types';

export class ProtocolManager {
    // Create a request message
    static createRequest(actionType: 'CODE_SUGGEST' | 'EXPLAIN' | 'RUN_COMMAND', userQuery: string, context?: any): ParsianRequest {
        return {
            id: uuidv4(),
            system_role: 'STRICT_JSON_ONLY_MODE',
            action_type: actionType,
            context: context || {},
            user_query: userQuery
        };
    }

    // Create a response message
    static createResponse(requestId: string, status: 'success' | 'error', data?: any, security?: any): ParsianResponse {
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
    static createErrorResponse(requestId: string, message: string): ParsianResponse {
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
    static validateRequest(request: any): request is ParsianRequest {
        return (
            typeof request === 'object' &&
            typeof request.id === 'string' &&
            request.system_role === 'STRICT_JSON_ONLY_MODE' &&
            (request.action_type === 'CODE_SUGGEST' || 
             request.action_type === 'EXPLAIN' || 
             request.action_type === 'RUN_COMMAND') &&
            typeof request.user_query === 'string'
        );
    }

    // Validate a response message
    static validateResponse(response: any): response is ParsianResponse {
        return (
            typeof response === 'object' &&
            typeof response.request_id === 'string' &&
            (response.status === 'success' || response.status === 'error') &&
            typeof response.data === 'object'
        );
    }

    // Parse a message from string
    static parseMessage(message: string): ParsianRequest | ParsianResponse | null {
        try {
            const parsed = JSON.parse(message);
            
            // Try to determine if it's a request or response
            if (this.validateRequest(parsed)) {
                return parsed;
            } else if (this.validateResponse(parsed)) {
                return parsed;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Failed to parse message:', error);
            return null;
        }
    }

    // Stringify a message
    static stringifyMessage(message: ParsianRequest | ParsianResponse): string {
        return JSON.stringify(message);
    }

    // Create a code suggestion request
    static createCodeSuggestionRequest(query: string, context?: any): ParsianRequest {
        return this.createRequest('CODE_SUGGEST', query, context);
    }

    // Create an explanation request
    static createExplanationRequest(query: string, context?: any): ParsianRequest {
        return this.createRequest('EXPLAIN', query, context);
    }

    // Create a command request
    static createCommandRequest(query: string, context?: any): ParsianRequest {
        return this.createRequest('RUN_COMMAND', query, context);
    }

    // Create a success response with code content
    static createCodeResponse(requestId: string, code: string, language: string = 'javascript', confidence: 'high' | 'medium' | 'low' = 'high'): ParsianResponse {
        return this.createResponse(requestId, 'success', {
            content: code,
            language: language
        }, {
            requires_confirmation: false,
            confidence: confidence
        });
    }

    // Create a success response with text content
    static createTextResponse(requestId: string, text: string, confidence: 'high' | 'medium' | 'low' = 'high'): ParsianResponse {
        return this.createResponse(requestId, 'success', {
            content: text,
            language: 'text'
        }, {
            requires_confirmation: false,
            confidence: confidence
        });
    }

    // Create a command response
    static createCommandResponse(requestId: string, commandOutput: string, requiresConfirmation: boolean = true, confidence: 'high' | 'medium' | 'low' = 'medium'): ParsianResponse {
        return this.createResponse(requestId, 'success', {
            content: commandOutput,
            language: 'bash'
        }, {
            requires_confirmation: requiresConfirmation,
            confidence: confidence
        });
    }
}