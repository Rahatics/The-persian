// Chat panel script for The Parsian AI Developer Agent

(function() {
    const vscode = acquireVsCodeApi();
    
    // State management
    const state = vscode.getState() || {
        messages: [],
        isConnected: false
    };
    
    // DOM elements
    let chatContainer, messageInput, sendButton, statusDot, statusText, typingIndicator, suggestionChips, debugBox, errorLogs, clearLogsButton, copyLogsButton;
    let geminiButton, chatgptButton, deepseekButton;
    
    // Initialize the chat panel
    function init() {
        // Get DOM elements
        chatContainer = document.getElementById('chat-container');
        messageInput = document.getElementById('message-input');
        sendButton = document.getElementById('send-button');
        statusDot = document.getElementById('status-dot');
        statusText = document.getElementById('status-text');
        typingIndicator = document.getElementById('typing-indicator');
        suggestionChips = document.getElementById('suggestion-chips');
        debugBox = document.getElementById('debug-box');
        errorLogs = document.getElementById('error-logs');
        clearLogsButton = document.getElementById('clear-logs');
        copyLogsButton = document.getElementById('copy-logs');
        geminiButton = document.getElementById('gemini-button');
        chatgptButton = document.getElementById('chatgpt-button');
        deepseekButton = document.getElementById('deepseek-button');
        
        // Restore state
        restoreState();
        
        // Set up event listeners
        if (sendButton) sendButton.addEventListener('click', sendMessage);
        if (messageInput) messageInput.addEventListener('keydown', handleKeyDown);
        
        // Set up suggestion chip listeners
        if (suggestionChips) {
            suggestionChips.querySelectorAll('.suggestion-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const action = chip.getAttribute('data-action');
                    handleSuggestionChip(action);
                });
            });
        }
        
        // Set up debug box listeners
        if (clearLogsButton) {
            clearLogsButton.addEventListener('click', () => {
                if (errorLogs) errorLogs.value = '';
            });
        }
        
        if (copyLogsButton) {
            copyLogsButton.addEventListener('click', () => {
                if (errorLogs) {
                    errorLogs.select();
                    document.execCommand('copy');
                }
            });
        }
        
        // Set up model selection listeners
        // Set Gemini as active by default
        if (geminiButton) {
            geminiButton.classList.add('active');
        }
        
        if (geminiButton) {
            geminiButton.addEventListener('click', () => {
                vscode.postMessage({ type: 'openAIService', service: 'gemini' });
                // Update button styles to show active selection
                geminiButton.classList.add('active');
                if (chatgptButton) {
                    chatgptButton.classList.remove('active');
                }
                if (deepseekButton) {
                    deepseekButton.classList.remove('active');
                }
            });
        }
        
        if (chatgptButton) {
            chatgptButton.addEventListener('click', () => {
                vscode.postMessage({ type: 'openAIService', service: 'chatgpt' });
                // Update button styles to show active selection
                chatgptButton.classList.add('active');
                if (geminiButton) {
                    geminiButton.classList.remove('active');
                }
                if (deepseekButton) {
                    deepseekButton.classList.remove('active');
                }
            });
        }
        
        if (deepseekButton) {
            deepseekButton.addEventListener('click', () => {
                vscode.postMessage({ type: 'openAIService', service: 'deepseek' });
                // Update button styles to show active selection
                deepseekButton.classList.add('active');
                if (geminiButton) {
                    geminiButton.classList.remove('active');
                }
                if (chatgptButton) {
                    chatgptButton.classList.remove('active');
                }
            });
        }
        
        // Notify extension that the panel is ready
        vscode.postMessage({ type: 'panelReady' });
    }
    
    // Restore state from VS Code
    function restoreState() {
        state.messages.forEach(message => {
            addMessageToChat(message.role, message.content, message.language);
        });
        
        updateConnectionStatus(state.isConnected);
        
        // Show suggestion chips if there are no messages
        if (state.messages.length === 0 && suggestionChips) {
            suggestionChips.classList.remove('hidden');
        }
    }
    
    // Update connection status UI
    function updateConnectionStatus(connected) {
        state.isConnected = connected;
        vscode.setState(state);
        
        if (statusDot && statusText) {
            if (connected) {
                statusDot.className = 'status-dot connected';
                statusText.textContent = 'Connected';
            } else {
                statusDot.className = 'status-dot disconnected';
                statusText.textContent = 'Disconnected';
            }
        }
    }
    
    // Handle keydown events in the message input
    function handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
    
    // Send a message to the AI
    function sendMessage() {
        if (!messageInput) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Clear input and save state
        messageInput.value = '';
        state.messages.push({ role: 'user', content: message });
        vscode.setState(state);
        
        // Hide suggestion chips after first message
        if (suggestionChips) {
            suggestionChips.classList.add('hidden');
        }
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send message to extension
        vscode.postMessage({
            type: 'userMessage',
            content: message
        });
    }
    
    // Handle suggestion chip clicks
    function handleSuggestionChip(action) {
        if (!messageInput) return;
        
        let message = '';
        
        switch (action) {
            case 'scan':
                message = 'Scan the project structure and provide an overview of the codebase.';
                break;
            case 'bugs':
                message = 'Analyze the codebase and identify potential bugs or issues.';
                break;
            case 'test':
                message = 'Write unit tests for the current file or selected code.';
                break;
            case 'optimize':
                message = 'Optimize the selected function or code block for better performance.';
                break;
            default:
                message = action;
        }
        
        // Set the message in the input field
        messageInput.value = message;
        messageInput.focus();
    }
    
    // Add a message to the chat container
    function addMessageToChat(role, content, language = null) {
        if (!chatContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        messageHeader.textContent = role === 'user' ? 'You' : 'The Parsian';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Format content based on type
        if (language === 'javascript' || language === 'typescript' || language === 'python' || language === 'bash') {
            const codeBlock = document.createElement('div');
            codeBlock.className = 'code-block';
            codeBlock.textContent = content;
            messageContent.appendChild(codeBlock);
            
            // Add apply code button for code responses
            if (role === 'ai') {
                const applyButton = document.createElement('button');
                applyButton.className = 'apply-code-button';
                applyButton.textContent = 'Apply Code';
                applyButton.addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'applyCode',
                        code: content,
                        language: language
                    });
                });
                messageContent.appendChild(applyButton);
            }
        } else {
            messageContent.textContent = content;
        }
        
        messageDiv.appendChild(messageHeader);
        messageDiv.appendChild(messageContent);
        chatContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Show typing indicator
    function showTypingIndicator() {
        if (typingIndicator && chatContainer) {
            typingIndicator.classList.remove('hidden');
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    
    // Hide typing indicator
    function hideTypingIndicator() {
        if (typingIndicator) {
            typingIndicator.classList.add('hidden');
        }
    }
    
    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'connectionStatus':
                updateConnectionStatus(message.connected);
                break;
                
            case 'aiResponse':
                hideTypingIndicator();
                addMessageToChat('ai', message.content, message.language);
                state.messages.push({ 
                    role: 'ai', 
                    content: message.content,
                    language: message.language
                });
                vscode.setState(state);
                break;
                
            case 'showTyping':
                showTypingIndicator();
                break;
                
            case 'hideTyping':
                hideTypingIndicator();
                break;
                
            case 'showSuggestions':
                if (suggestionChips) {
                    suggestionChips.classList.remove('hidden');
                }
                break;
                
            case 'showApplyCodeButton':
                // This is handled in the addMessageToChat function
                hideTypingIndicator();
                addMessageToChat('ai', message.code, message.language);
                state.messages.push({ 
                    role: 'ai', 
                    content: message.code,
                    language: message.language
                });
                vscode.setState(state);
                break;
                
            case 'error':
                hideTypingIndicator();
                addMessageToChat('ai', `Error: ${message.content}`);
                state.messages.push({ 
                    role: 'ai', 
                    content: `Error: ${message.content}`
                });
                vscode.setState(state);
                
                // Log error to debug box
                logErrorToDebugBox(message.content);
                break;
        }
    });
    
    // Log error to debug box
    function logErrorToDebugBox(error) {
        if (errorLogs) {
            const timestamp = new Date().toISOString();
            errorLogs.value += `[${timestamp}] ${error}\n`;
            errorLogs.scrollTop = errorLogs.scrollHeight;
            
            // Show debug box if it's hidden
            if (debugBox) {
                debugBox.style.display = 'block';
            }
        }
    }
    
    // Initialize when the script loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();