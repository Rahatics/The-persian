# The Parsian AI Developer Agent

An AI developer agent that works through browser parsing with native IDE control.

## Project Structure

This project consists of two main components:

1. **VS Code Extension** (The Brain) - Located in this repository
2. **Browser Extension** (The Bridge) - Separate repository

## Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile TypeScript files

## Development

- Run `npm run watch` to automatically compile on file changes
- Press `F5` in VS Code to launch the extension in a new Extension Development Host window

## Features

Based on the blueprint in [project idea.md](project%20idea.md):

- WebSocket communication between VS Code and browser extensions
- Dynamic port allocation with lock file management
- JSON-based communication protocol
- Security measures including auto-approval policies
- RAG and session history for context management

## Architecture

The system uses a dual-core model connected via a local WebSocket bridge:

- **Server (Host)**: VS Code Extension (Node.js Env)
- **Client (Parser)**: Browser Extension (Chrome/Firefox)
- **Communication**: Encrypted WebSocket (`ws://127.0.0.1:{DYNAMIC_PORT}`)