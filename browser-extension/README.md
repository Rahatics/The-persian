# The Parsian Browser Extension (The Bridge)

This is the browser extension component of The Parsian AI Developer Agent. It acts as a bridge between AI services (like ChatGPT and Gemini) and the VS Code extension.

## Components

### 1. Manifest (`manifest.json`)
- Defines extension metadata, permissions, and entry points
- Specifies content scripts for AI service pages
- Configures background service worker

### 2. Background Service Worker (`background.js`)
- Maintains persistent WebSocket connection to VS Code extension
- Handles message routing between browser and VS Code
- Implements reconnection logic
- Manages extension lifecycle events

### 3. Content Script (`content.js`)
- Runs on AI service pages (ChatGPT, Gemini)
- Monitors DOM for new AI responses using MutationObserver
- Extracts code and text from AI responses
- Interacts with AI services programmatically
- Uses clipboard API for code extraction

### 4. Popup UI (`popup.html` + `popup.js`)
- Provides user interface for extension status
- Shows connection status to VS Code extension
- Offers setup instructions
- Allows manual connection triggering

## Communication Flow

1. **VS Code Extension** ↔ **Background Service Worker** (WebSocket)
2. **Background Service Worker** ↔ **Content Script** (Chrome Messaging API)
3. **Content Script** ↔ **AI Service** (DOM Manipulation)

## Features

- Automatic detection of supported AI services
- Real-time monitoring of AI responses
- Clipboard-based code extraction
- Robust connection management with reconnection logic
- Support for multiple AI services (ChatGPT, Gemini)
- Status indicators and user feedback

## Installation

1. Load the extension in Chrome/Edge as an unpacked extension
2. Navigate to the extension directory
3. Enable "Developer mode" in the browser extensions page
4. Click "Load unpacked" and select this directory

## Development

- All JavaScript files use modern ES6+ syntax
- Content scripts are injected only on supported AI service domains
- Background script maintains persistent connection state
- Popup UI updates dynamically based on connection status