// mcpserver.ts

import {
    createMessageConnection,
    StreamMessageReader,
    StreamMessageWriter
} from 'vscode-jsonrpc/node';
import { outsystemsTools, Tool } from './tools';
import { OutSystemsService } from './outsystems-service';

async function main() {
    console.error('[SERVER] Initializing MCP Server...');

    const connection = createMessageConnection(
        new StreamMessageReader(process.stdin),
        new StreamMessageWriter(process.stdout)
    );

    const outsystemsService = new OutSystemsService();

    // --- MCP/SPEC HANDLER (CRITICAL FOR DISCOVERABILITY) ---
    // This handler tells the LLM client what tools are available.
    connection.onRequest('mcp/spec', () => {
        console.error('[SERVER] Received mcp/spec request. Providing tool definitions.');
        
        // We build the spec by taking the definitions from our tools file,
        // but omitting the 'execute' function itself, as the client doesn't need it.
        const toolDefinitions: Record<string, Omit<Tool, 'execute'>> = {};
        for (const key in outsystemsTools) {
            const { execute, ...definition } = outsystemsTools[key];
            toolDefinitions[key] = definition;
        }

        return {
            name: 'outsystems-generator',
            description: 'A server that can generate, build, and publish OutSystems applications from a prompt.',
            tools: toolDefinitions,
        };
    });

    // --- DYNAMIC TOOL REGISTRATION ---
    // This loop automatically registers an RPC handler for every tool defined in `tools.ts`.
    for (const tool of Object.values(outsystemsTools)) {
        connection.onRequest(tool.name, async (params: any) => {
            try {
                console.error(`[SERVER] Executing tool: ${tool.name} with params:`, params);
                const result = await tool.execute(outsystemsService, params);
                return { success: true, ...result };
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`[SERVER] Error in ${tool.name}: ${msg}`);
                return { success: false, error: `Execution failed for ${tool.name}: ${msg}` };
            }
        });
    }

    // Pre-warm the token cache in the background for faster first-time execution.
    outsystemsService.getValidToken().catch(err => 
        console.error(`[SERVER] Failed to pre-warm token cache: ${err.message}`)
    );

    connection.listen();
    console.error('[SERVER] MCP Server is running and listening on stdio.');
}

// Run the server
main().catch(err => {
    console.error(`[SERVER] A fatal error occurred during initialization: ${err.message}`);
    process.exit(1);
});
