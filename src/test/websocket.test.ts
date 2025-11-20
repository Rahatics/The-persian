import * as assert from 'assert';
import { ParsianServer } from '../server';

suite('WebSocket Server Test Suite', () => {
    test('Server should start and stop without errors', async () => {
        const server = new ParsianServer();
        
        // Start the server
        try {
            await server.start();
            assert.ok(true, 'Server started successfully');
        } catch (error) {
            assert.fail(`Failed to start server: ${error}`);
        }
        
        // Stop the server
        try {
            server.stop();
            assert.ok(true, 'Server stopped successfully');
        } catch (error) {
            assert.fail(`Failed to stop server: ${error}`);
        }
    });
});