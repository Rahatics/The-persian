// Popup script for The Parsian Browser Extension

document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const statusDotElement = document.querySelector('.status-dot');
  const statusTextElement = document.getElementById('status-text');
  const connectButton = document.getElementById('connect-btn');
  let connectionCheckInterval;
  
  // Check connection status
  checkConnectionStatus();
  
  // Set up periodic connection status checking
  connectionCheckInterval = setInterval(checkConnectionStatus, 3000);
  
  // Set up button click handler
  connectButton.addEventListener('click', function() {
    // Send a message to the background script to initiate connection
    chrome.runtime.sendMessage({action: 'initiateConnection'}, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to background script:', chrome.runtime.lastError);
        alert('Failed to send connection request. Please check the browser console for details.');
      } else {
        alert('Connection request sent to VS Code extension. Please check VS Code for confirmation.');
      }
    });
  });
  
  // Check connection status with the background script
  function checkConnectionStatus() {
    // Communicate with the background script to check the WebSocket connection status
    chrome.runtime.sendMessage({action: 'getConnectionStatus'}, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error getting connection status:', chrome.runtime.lastError);
        updateStatus(false);
      } else {
        updateStatus(response.connected);
      }
    });
  }
  
  // Update the UI based on connection status
  function updateStatus(connected) {
    if (connected) {
      statusElement.className = 'status connected';
      statusDotElement.className = 'status-dot connected';
      statusTextElement.textContent = 'Connected to VS Code';
      connectButton.textContent = 'Reconnect';
      // Clear the interval when connected
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        connectionCheckInterval = null;
      }
    } else {
      statusElement.className = 'status disconnected';
      statusDotElement.className = 'status-dot disconnected';
      statusTextElement.textContent = 'Disconnected';
      connectButton.textContent = 'Connect to VS Code';
      // Start the interval if not already running
      if (!connectionCheckInterval) {
        connectionCheckInterval = setInterval(checkConnectionStatus, 3000);
      }
    }
  }
});