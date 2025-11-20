// Background service worker for The Parsian Browser Extension
let websocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Error handling and retry mechanisms
const ERROR_RETRY_ATTEMPTS = 3;
const ERROR_RETRY_DELAY = 1000;
let pendingMessages = new Map(); // Store messages that failed to send

// Load the port by trying multiple common ports
async function getPortFromLockFile() {
  // Common ports that the server might use
  const commonPorts = [8765, 8766, 8767, 8768, 8769];
  
  // Try each port in sequence
  for (const port of commonPorts) {
    try {
      console.log(`Checking if server is running on port ${port}`);
      // We'll rely on the connection attempt to determine if the port is correct
      return port;
    } catch (error) {
      console.log(`Port ${port} not available, trying next port`);
      continue;
    }
  }
  
  // Fallback to default port
  console.warn('Could not find server on any common port, using default port 8765');
  return 8765;
}

// Connect to the WebSocket server
async function connectToWebSocket() {
  // Try multiple ports
  const commonPorts = [8765, 8766, 8767, 8768, 8769];
  let lastError;
  
  for (const port of commonPorts) {
    try {
      const wsUrl = `ws://127.0.0.1:${port}`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      websocket = new WebSocket(wsUrl);
      
      // Create a promise to handle connection result
      const connectionPromise = new Promise((resolve, reject) => {
        websocket.onopen = function(event) {
          console.log(`Connected to VS Code extension on port ${port}`);
          resetConnectionStatus();
          chrome.action.setIcon({path: 'TheParsian-16x16.png'});
          
          // Send any pending messages
          sendPendingMessages();
          resolve();
        };
        
        websocket.onmessage = function(event) {
          console.log('Received message from VS Code:', event.data);
          handleMessageFromVSCode(event.data);
        };
        
        websocket.onclose = function(event) {
          console.log('WebSocket connection closed', event);
          console.log('Close code:', event.code);
          console.log('Close reason:', event.reason);
          console.log('Was clean:', event.wasClean);
          // Don't handle disconnection here, let the error handler do it
        };
        
        websocket.onerror = function(error) {
          console.error(`WebSocket error on port ${port}:`, error);
          console.error('WebSocket error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          reject(error);
        };
      });
      
      // Wait for connection with timeout
      await Promise.race([
        connectionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      // If we get here, connection was successful
      return;
    } catch (error) {
      console.log(`Failed to connect on port ${port}:`, error.message);
      lastError = error;
      
      // Clean up the websocket if it was created
      if (websocket) {
        websocket.close();
        websocket = null;
      }
      
      // Continue to next port
    }
  }
  
  // If we get here, all ports failed
  console.error('Failed to connect to WebSocket on any port:', lastError);
  handleDisconnection();
}

// Send a message with retry mechanism
function sendWithRetry(message, messageId) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    // Store message for later sending
    pendingMessages.set(messageId, message);
    console.log('WebSocket not connected, message queued:', messageId);
    return false;
  }
  
  try {
    websocket.send(message);
    console.log('Message sent successfully:', messageId);
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Store for retry
    pendingMessages.set(messageId, message);
    
    // Retry mechanism
    retrySendMessage(messageId, message, 1);
    return false;
  }
}

// Retry sending a message
async function retrySendMessage(messageId, message, attempt) {
  if (attempt > ERROR_RETRY_ATTEMPTS) {
    console.error(`Failed to send message after ${ERROR_RETRY_ATTEMPTS} attempts:`, messageId);
    pendingMessages.delete(messageId);
    return;
  }
  
  console.log(`Retrying message send (attempt ${attempt}):`, messageId);
  
  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, ERROR_RETRY_DELAY * attempt));
  
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    // Still not connected, retry
    retrySendMessage(messageId, message, attempt + 1);
    return;
  }
  
  try {
    websocket.send(message);
    console.log('Message sent successfully on retry:', messageId);
    pendingMessages.delete(messageId);
  } catch (error) {
    console.error(`Error sending message on retry ${attempt}:`, error);
    retrySendMessage(messageId, message, attempt + 1);
  }
}

// Send pending messages
function sendPendingMessages() {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  console.log(`Sending ${pendingMessages.size} pending messages`);
  
  for (const [messageId, message] of pendingMessages.entries()) {
    try {
      websocket.send(message);
      console.log('Pending message sent:', messageId);
      pendingMessages.delete(messageId);
    } catch (error) {
      console.error('Error sending pending message:', error);
      // Will retry on next connection
    }
  }
}

// Handle disconnection and reconnection logic
function handleDisconnection() {
  chrome.action.setIcon({path: 'TheParsian-16x16.png'});
  
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`Reconnection attempt ${reconnectAttempts} in ${RECONNECT_DELAY}ms`);
    
    setTimeout(() => {
      connectToWebSocket();
    }, RECONNECT_DELAY);
  } else {
    console.log('Max reconnection attempts reached');
    // Show error to user
    chrome.action.setBadgeText({text: 'ERR'});
    chrome.action.setBadgeBackgroundColor({color: '#FF0000'});
  }
}

// Reset connection status
function resetConnectionStatus() {
  reconnectAttempts = 0;
  chrome.action.setBadgeText({text: ''});
}

// Handle messages from VS Code extension
function handleMessageFromVSCode(data) {
  try {
    const message = JSON.parse(data);
    
    // Process the message based on its type
    switch (message.action_type) {
      case 'CODE_SUGGEST':
        handleCodeSuggestion(message);
        break;
      case 'EXPLAIN':
        handleExplanationRequest(message);
        break;
      case 'RUN_COMMAND':
        handleCommandRequest(message);
        break;
      default:
        // Treat unknown action types as general chat messages
        console.log('Treating as general chat message:', message);
        handleGeneralChatMessage(message);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
    // Send error response
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        status: 'error',
        message: 'Invalid message format'
      }));
    }
  }
}

// Listen for messages from the content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  
  switch (request.action) {
    case 'ai_response':
    case 'ai_response_complete':
      // Forward AI responses to VS Code extension
      const response = {
        type: 'ai_response',
        content: request.content,
        codeBlocks: request.codeBlocks,
        isComplete: request.action === 'ai_response_complete'
      };
      const responseId = 'response_' + Date.now();
      sendWithRetry(JSON.stringify(response), responseId);
      sendResponse({ success: true });
      break;
    
    case 'rate_limit_detected':
      // Handle rate limiting
      console.log('Rate limit detected at:', new Date(request.timestamp));
      
      // Forward to VS Code extension
      const rateLimitId = 'rate_limit_' + Date.now();
      sendWithRetry(JSON.stringify({
        type: 'rate_limit_detected',
        timestamp: request.timestamp
      }), rateLimitId);
      sendResponse({ success: true });
      break;
      
    case 'captcha_detected':
      // Handle CAPTCHA detection
      console.log('CAPTCHA detected at:', new Date(request.timestamp));
      
      // Forward to VS Code extension
      const captchaId = 'captcha_' + Date.now();
      sendWithRetry(JSON.stringify({
        type: 'captcha_detected',
        timestamp: request.timestamp
      }), captchaId);
      sendResponse({ success: true });
      break;
      
    case 'initiateConnection':
      // User clicked the connect button in the popup
      console.log('Connection initiation requested from popup');
      // Try to connect to WebSocket
      connectToWebSocket();
      sendResponse({ success: true });
      break;
      
    case 'getConnectionStatus':
      // Popup is requesting connection status
      const isConnected = websocket && websocket.readyState === WebSocket.OPEN;
      sendResponse({ connected: isConnected });
      break;
    
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // Keep the message channel open for async response
});

// Handle code suggestion requests
function handleCodeSuggestion(message) {
  console.log('Handling code suggestion request:', message);
  
  // Forward the request to the content script to interact with the AI service
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      console.log('Sending code suggestion to content script of tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'send_message',
        message: message.user_query
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError);
          // Send error response back to VS Code
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              request_id: message.id,
              status: 'error',
              message: 'Failed to send message to AI service: ' + chrome.runtime.lastError.message
            }));
          }
        } else {
          console.log('Message sent to content script:', response);
          // The actual response will come back through the ai_response handler
        }
      });
    } else {
      console.log('No active tab found for code suggestion');
      // Send error response back to VS Code
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          request_id: message.id,
          status: 'error',
          message: 'No active tab found'
        }));
      }
    }
  });
}

// Handle explanation requests
function handleExplanationRequest(message) {
  console.log('Handling explanation request:', message);
  
  // Forward the request to the content script to interact with the AI service
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      console.log('Sending explanation request to content script of tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'send_message',
        message: message.user_query
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError);
          // Send error response back to VS Code
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              request_id: message.id,
              status: 'error',
              message: 'Failed to send message to AI service: ' + chrome.runtime.lastError.message
            }));
          }
        } else {
          console.log('Message sent to content script:', response);
          // The actual response will come back through the ai_response handler
        }
      });
    } else {
      console.log('No active tab found for explanation request');
      // Send error response back to VS Code
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          request_id: message.id,
          status: 'error',
          message: 'No active tab found'
        }));
      }
    }
  });
}

// Handle command requests
function handleCommandRequest(message) {
  console.log('Handling command request:', message);
  
  // Forward the request to the content script to interact with the AI service
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      console.log('Sending command request to content script of tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'send_message',
        message: message.user_query
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError);
          // Send error response back to VS Code
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              request_id: message.id,
              status: 'error',
              message: 'Failed to send message to AI service: ' + chrome.runtime.lastError.message
            }));
          }
        } else {
          console.log('Message sent to content script:', response);
          // The actual response will come back through the ai_response handler
        }
      });
    } else {
      console.log('No active tab found for command request');
      // Send error response back to VS Code
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          request_id: message.id,
          status: 'error',
          message: 'No active tab found'
        }));
      }
    }
  });
}

// Handle general chat messages
function handleGeneralChatMessage(message) {
  console.log('Handling general chat message:', message);
  
  // Forward the request to the content script to interact with the AI service
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      console.log('Sending message to content script of tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'send_message',
        message: message.user_query
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError);
          // Send error response back to VS Code
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              request_id: message.id,
              status: 'error',
              message: 'Failed to send message to AI service: ' + chrome.runtime.lastError.message
            }));
          }
        } else {
          console.log('Message sent to content script:', response);
          // The actual response will come back through the ai_response handler
        }
      });
    } else {
      console.log('No active tab found');
      // Send error response back to VS Code
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          request_id: message.id,
          status: 'error',
          message: 'No active tab found'
        }));
      }
    }
  });
}

// Send a response back to VS Code
function sendResponse(response) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(response));
  }
}

// Initialize the extension
chrome.runtime.onStartup.addListener(() => {
  console.log('The Parsian Browser Extension started');
  connectToWebSocket();
});

// Also connect when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('The Parsian Browser Extension installed/updated');
  connectToWebSocket();
});

// Attempt to connect immediately when the background script loads
connectToWebSocket();