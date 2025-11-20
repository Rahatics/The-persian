// Content script for The Parsian Browser Extension
// This script runs on AI service pages (ChatGPT, Gemini, etc.)

console.log('The Parsian Content Script loaded');

// Configuration for different AI services
const AI_SERVICE_CONFIGS = {
  'chatgpt': {
    name: 'ChatGPT',
    urlPattern: 'https://chat.openai.com/*',
    messageSelector: '[data-message-author-role="assistant"]',
    inputSelector: 'textarea#prompt-textarea',
    sendButtonSelector: 'button[data-testid="send-button"]',
    stopButtonSelector: 'button[data-testid="stop-button"]',
    copyButtonSelector: 'button[aria-label="Copy"]',
    rateLimitSelector: '.text-red-500', // Selector for rate limit messages
    captchaSelector: '.g-recaptcha' // Selector for CAPTCHA elements
  },
  'gemini': {
    name: 'Gemini',
    urlPattern: 'https://gemini.google.com/*',
    messageSelector: '.message-content',
    inputSelector: '.ql-editor',
    sendButtonSelector: '.send-button',
    stopButtonSelector: '.stop-button',
    copyButtonSelector: '.copy-button',
    rateLimitSelector: '.rate-limit-warning', // Selector for rate limit messages
    captchaSelector: '.captcha-container' // Selector for CAPTCHA elements
  },
  'deepseek': {
    name: 'DeepSeek',
    urlPattern: 'https://chat.deepseek.com/*',
    messageSelector: '.assistant-message',
    inputSelector: 'textarea[placeholder*="Send a message"]',
    sendButtonSelector: 'button[type="submit"]',
    stopButtonSelector: '.stop-generate-button',
    copyButtonSelector: '.copy-code-button',
    rateLimitSelector: '.rate-limit-message', // Selector for rate limit messages
    captchaSelector: '.captcha-challenge' // Selector for CAPTCHA elements
  }
};

// Current AI service configuration
let currentServiceConfig = null;

// Mutation observer for detecting DOM changes
let mutationObserver = null;

// Initialize the content script
function init() {
  console.log('Initializing content script');
  console.log('Current URL:', window.location.href);
  
  // Detect which AI service we're on
  currentServiceConfig = detectAIService();
  
  if (currentServiceConfig) {
    console.log(`Detected AI service: ${currentServiceConfig.name}`);
    setupObservers();
  } else {
    console.log('No supported AI service detected');
    // Let's log all available configs for debugging
    console.log('Available AI service configs:', AI_SERVICE_CONFIGS);
  }
}

// Detect which AI service we're currently on
function detectAIService() {
  const currentUrl = window.location.href;
  console.log('Detecting AI service for URL:', currentUrl);
  
  for (const [key, config] of Object.entries(AI_SERVICE_CONFIGS)) {
    console.log(`Checking ${key} with pattern:`, config.urlPattern);
    if (currentUrl.match(config.urlPattern)) {
      console.log(`Matched AI service: ${key}`);
      return config;
    }
  }
  
  console.log('No matching AI service found');
  return null;
}

// Set up observers for DOM changes
function setupObservers() {
  // Create a mutation observer to watch for changes in the DOM
  mutationObserver = new MutationObserver((mutations) => {
    // Throttle the handling of DOM changes to prevent performance issues
    if (!this.isHandlingChanges) {
      this.isHandlingChanges = true;
      
      // Use requestAnimationFrame to defer processing to the next frame
      requestAnimationFrame(() => {
        handleDOMChanges(mutations).catch(error => {
          console.error('Error handling DOM changes:', error);
        }).finally(() => {
          this.isHandlingChanges = false;
        });
      });
    }
  });
  
  // Start observing the document body for changes
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-message-author-role']
  });
  
  // Add performance monitoring
  this.isHandlingChanges = false;
  this.lastMutationTime = Date.now();
  
  console.log('Mutation observer started');
}

// Handle DOM changes
async function handleDOMChanges(mutations) {
  // Performance monitoring
  const startTime = Date.now();
  
  // Look for new messages from the AI
  const newMessages = document.querySelectorAll(`${currentServiceConfig.messageSelector}:not([data-parsian-processed])`);
  
  // Process each new message
  for (const message of newMessages) {
    // Mark as processed to avoid duplicate handling
    message.setAttribute('data-parsian-processed', 'true');
    
    // Process the new message
    await processNewMessage(message);
  }
  
  // Check if the stop button has appeared (indicating response completion)
  const stopButton = document.querySelector(currentServiceConfig.stopButtonSelector);
  if (stopButton) {
    handleResponseCompletion();
  }
  
  // Check for rate limiting or CAPTCHA
  checkForRateLimiting();
  checkForCaptcha();
  
  // Advanced DOM parsing for incremental updates
  await parseIncrementalDOMChanges(mutations);
  
  // Performance monitoring
  const endTime = Date.now();
  console.log(`DOM changes handled in ${endTime - startTime}ms`);
}

// Parse incremental DOM changes for more efficient processing
async function parseIncrementalDOMChanges(mutations) {
  // Process only the specific changes in the mutations
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      // Handle added nodes
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this is a message element
          if (node.matches && node.matches(currentServiceConfig.messageSelector)) {
            // Mark as processed to avoid duplicate handling
            node.setAttribute('data-parsian-processed', 'true');
            
            // Process the new message
            processNewMessage(node);
          }
          
          // Check for specific elements within added nodes
          const messageElements = node.querySelectorAll && node.querySelectorAll(currentServiceConfig.messageSelector);
          if (messageElements) {
            messageElements.forEach(message => {
              if (!message.hasAttribute('data-parsian-processed')) {
                message.setAttribute('data-parsian-processed', 'true');
                processNewMessage(message);
              }
            });
          }
        }
      });
    } else if (mutation.type === 'attributes') {
      // Handle attribute changes
      if (mutation.target.matches && mutation.target.matches(currentServiceConfig.stopButtonSelector)) {
        // Stop button attribute changed, check if it's now visible
        const computedStyle = window.getComputedStyle(mutation.target);
        if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
          handleResponseCompletion();
        }
      }
    }
  }
}

// Check for rate limiting messages
function checkForRateLimiting() {
  if (!currentServiceConfig.rateLimitSelector) return;
  
  const rateLimitElements = document.querySelectorAll(currentServiceConfig.rateLimitSelector);
  
  if (rateLimitElements.length > 0) {
    console.log('Rate limit detected');
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'rate_limit_detected',
      timestamp: Date.now()
    });
  }
}

// Check for CAPTCHA challenges
function checkForCaptcha() {
  if (!currentServiceConfig.captchaSelector) return;
  
  const captchaElements = document.querySelectorAll(currentServiceConfig.captchaSelector);
  
  if (captchaElements.length > 0) {
    console.log('CAPTCHA detected');
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'captcha_detected',
      timestamp: Date.now()
    });
  }
}

// Process a new message from the AI
async function processNewMessage(messageElement) {
  console.log('New AI message detected:', messageElement);
  
  // Extract the text content
  const messageText = messageElement.textContent.trim();
  
  // Extract code blocks using both DOM parsing and clipboard hijacking
  const domCodeBlocks = extractCodeBlocks(messageElement);
  const clipboardCodeBlocks = await extractCodeWithClipboard(messageElement);
  
  // Combine code blocks
  const codeBlocks = [...domCodeBlocks, ...clipboardCodeBlocks];
  
  // Send the message to the background script
  // which will then forward it to the VS Code extension
  chrome.runtime.sendMessage({
    action: 'ai_response',
    content: messageText,
    codeBlocks: codeBlocks
  });
  
  console.log('Message content:', messageText);
  console.log('Code blocks:', codeBlocks);
}

// Handle response completion (when the stop button appears)
function handleResponseCompletion() {
  console.log('AI response completed');
  
  // Extract the complete response from the page
  const messages = document.querySelectorAll(`${currentServiceConfig.messageSelector}[data-parsian-processed]`);
  
  if (messages.length > 0) {
    // Get the last message which should be the complete response
    const lastMessage = messages[messages.length - 1];
    const messageText = lastMessage.textContent.trim();
    
    // Extract code blocks
    const codeBlocks = extractCodeBlocks(lastMessage);
    
    // Send the complete response to the background script
    chrome.runtime.sendMessage({
      action: 'ai_response_complete',
      content: messageText,
      codeBlocks: codeBlocks
    });
  }
}

// Extract code blocks from a message element
function extractCodeBlocks(messageElement) {
  const codeBlocks = [];
  
  // Look for pre elements which typically contain code blocks
  const preElements = messageElement.querySelectorAll('pre');
  
  preElements.forEach(pre => {
    const codeElement = pre.querySelector('code');
    if (codeElement) {
      const language = codeElement.className.match(/language-(\w+)/)?.[1] || 'plaintext';
      codeBlocks.push({
        language: language,
        content: codeElement.textContent
      });
    } else {
      // If there's no code element, just get the text content
      codeBlocks.push({
        language: 'plaintext',
        content: pre.textContent
      });
    }
  });
  
  return codeBlocks;
}

// Function to send a message to the AI service
function sendMessageToAI(message) {
  console.log('Sending message to AI service:', message);
  console.log('Current service config:', currentServiceConfig);
  
  if (!currentServiceConfig) {
    console.log('No current service config found');
    return;
  }
  
  const inputElement = document.querySelector(currentServiceConfig.inputSelector);
  const sendButton = document.querySelector(currentServiceConfig.sendButtonSelector);
  
  console.log('Input element:', inputElement);
  console.log('Send button:', sendButton);
  
  if (inputElement && sendButton) {
    // Clear the input field
    inputElement.value = '';
    
    // Set the new message
    inputElement.value = message;
    
    // Trigger input event to make the send button active
    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);
    console.log('Input event dispatched');
    
    // Click the send button
    setTimeout(() => {
      console.log('Clicking send button');
      sendButton.click();
    }, 100);
  } else {
    console.log('Could not find input element or send button');
  }
}

// Function to copy code from a message
function copyCodeFromMessage(messageElement) {
  if (!currentServiceConfig) return;
  
  // Look for copy buttons within the message
  const copyButtons = messageElement.querySelectorAll(currentServiceConfig.copyButtonSelector);
  
  if (copyButtons.length > 0) {
    // Click the first copy button
    copyButtons[0].click();
    
    // Return a promise that resolves with the clipboard content
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const clipboardContent = await navigator.clipboard.readText();
          resolve(clipboardContent);
        } catch (error) {
          console.error('Error reading clipboard:', error);
          resolve(null);
        }
      }, 500); // Wait a bit for the copy operation to complete
    });
  }
  
  return Promise.resolve(null);
}

// Enhanced function to extract code with clipboard hijacking
async function extractCodeWithClipboard(messageElement) {
  if (!currentServiceConfig) return null;
  
  // First, try to find and click copy buttons for code blocks
  const copyButtons = messageElement.querySelectorAll(currentServiceConfig.copyButtonSelector);
  
  const codeBlocks = [];
  
  // Save current clipboard content
  let originalClipboard = null;
  try {
    originalClipboard = await navigator.clipboard.readText();
  } catch (error) {
    console.log('Could not read original clipboard content');
  }
  
  // Process each copy button
  for (let i = 0; i < copyButtons.length; i++) {
    const button = copyButtons[i];
    
    // Click the copy button
    button.click();
    
    // Wait for clipboard to update
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      // Read the clipboard content
      const clipboardContent = await navigator.clipboard.readText();
      
      // Add to code blocks
      codeBlocks.push({
        content: clipboardContent,
        language: detectCodeLanguage(clipboardContent)
      });
    } catch (error) {
      console.error('Error reading clipboard:', error);
    }
  }
  
  // Restore original clipboard content if we had it
  if (originalClipboard !== null) {
    try {
      await navigator.clipboard.writeText(originalClipboard);
    } catch (error) {
      console.log('Could not restore original clipboard content');
    }
  }
  
  return codeBlocks;
}

// Simple function to detect code language based on content
function detectCodeLanguage(code) {
  // Simple heuristics for language detection
  if (code.includes('function') || code.includes('const') || code.includes('let')) {
    return 'javascript';
  } else if (code.includes('public class') || code.includes('private static')) {
    return 'java';
  } else if (code.includes('def ') || code.includes('import ') && code.includes('.py')) {
    return 'python';
  } else if (code.includes('<?php') || code.includes('echo ')) {
    return 'php';
  } else if (code.includes('using System') || code.includes('namespace ')) {
    return 'csharp';
  } else {
    return 'plaintext';
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message from background script:', request);
  
  switch (request.action) {
    case 'send_message':
      sendMessageToAI(request.message);
      sendResponse({ success: true });
      break;
      
    case 'extract_code':
      // In a real implementation, this would extract code from the latest message
      sendResponse({ success: true, code: '// Placeholder code extraction' });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  // Return true to indicate that we'll send a response asynchronously
  return true;
});

// Initialize when the script loads
init();