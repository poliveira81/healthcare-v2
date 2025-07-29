/**
 * =================================================================
 * Minimal "Ping" MCP Server for Debugging Timeouts
 * =================================================================
 * This server does not perform any authentication or complex tasks.
 * Its only purpose is to start as fast as possible and respond to a
 * simple "ping" request.
 *
 * If this server works, the timeout issue is related to the startup
 * complexity of the full application. If this server fails, the issue
is with the Perplexity environment or core configuration.
 */
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

console.error('[DEBUG_SERVER] Initializing minimal MCP "Ping" Server...');

const connection = createMessageConnection(
    new StreamMessageReader(process.stdin),
    new StreamMessageWriter(process.stdout)
);

// A single, synchronous handler that does nothing complex.
connection.onRequest('tool/ping', (params: any) => {
    console.error(`[DEBUG_SERVER] Received 'tool/ping'. Responding with 'pong'.`);
    // Immediately return a simple object.
    return {
        response: 'pong',
        timestamp: new Date().toISOString()
    };
});

// Start listening immediately.
connection.listen();

console.error('[DEBUG_SERVER] Minimal MCP connection listener is active. Ready for ping requests.');
