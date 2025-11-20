# The Parsian AI Developer Agent

An AI developer agent that works through browser parsing with native IDE control.

## Project Structure

This project consists of two main components:

1. **VS Code Extension** (The Brain) - Located in the [src](src) directory
2. **Browser Extension** (The Bridge) - Located in the [browser-extension](browser-extension) directory

## Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile TypeScript files

## Development

- Run `npm run watch` to automatically compile on file changes
- Press `F5` in VS Code to launch the extension in a new Extension Development Host window

## Features

- WebSocket communication between VS Code and browser extensions
- Dynamic port allocation with lock file management
- JSON-based communication protocol
- Security measures including auto-approval policies
- RAG and session history for context management
- Support for multiple AI services (ChatGPT, Gemini, DeepSeek)
- Code suggestion and explanation capabilities
- Project structure scanning and analysis

## Architecture

The system uses a dual-component model connected via a local WebSocket bridge:

- **Server (Host)**: VS Code Extension (Node.js Env)
- **Client (Parser)**: Browser Extension (Chrome/Firefox)
- **Communication**: WebSocket (`ws://127.0.0.1:{DYNAMIC_PORT}`)

## Browser Extension

The browser extension acts as a bridge between the VS Code extension and AI services:

- Content scripts that interact with AI service web interfaces
- Background script that handles WebSocket communication
- Popup UI for connection management

## VS Code Extension

The VS Code extension provides the main user interface and functionality:

- Chat panel for interacting with AI services
- Context management for code-aware conversations
- Security and confirmation systems
- Integration with VS Code's API for file operations

## Installation

1. **VS Code Extension**:
   - Run `vsce package` to create a VSIX package
   - Install the VSIX file in VS Code

2. **Browser Extension**:
   - Load the [browser-extension](browser-extension) directory as an unpacked extension in Chrome/Edge
   - Enable developer mode in the browser extensions page