"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const server_1 = require("../server");
suite('WebSocket Server Test Suite', () => {
    test('Server should start and stop without errors', async () => {
        const server = new server_1.ParsianServer();
        // Start the server
        try {
            await server.start();
            assert.ok(true, 'Server started successfully');
        }
        catch (error) {
            assert.fail(`Failed to start server: ${error}`);
        }
        // Stop the server
        try {
            server.stop();
            assert.ok(true, 'Server stopped successfully');
        }
        catch (error) {
            assert.fail(`Failed to stop server: ${error}`);
        }
    });
});
//# sourceMappingURL=websocket.test.js.map