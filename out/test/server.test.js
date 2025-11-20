"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const server_1 = require("../server");
const ws = require("ws");
suite('Parsian Server Test Suite', () => {
    let server;
    setup(() => {
        server = new server_1.ParsianServer();
    });
    teardown(() => {
        server.stop();
    });
    test('Server should start and stop without errors', async () => {
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
    test('Server should handle client connections', async () => {
        // Start the server
        await server.start();
        // Create a client connection
        const port = server.port; // Access private property for testing
        const client = new ws.WebSocket(`ws://127.0.0.1:${port}`);
        // Wait for connection
        await new Promise((resolve) => {
            client.on('open', () => {
                resolve();
            });
        });
        // Verify connection is established
        assert.strictEqual(client.readyState, ws.WebSocket.OPEN, 'Client should be connected');
        // Close client
        client.close();
    });
});
//# sourceMappingURL=server.test.js.map