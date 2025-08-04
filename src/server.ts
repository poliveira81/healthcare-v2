import dotenv from 'dotenv';
import path from 'path';

// Explicitly configure dotenv to load the .env file from the project root.
// This makes the server's execution independent of the working directory.
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initializeTools } from './tools.js';

/**
 * The main function that initializes and runs the MCP server.
 */
async function main() {
  // Create a new MCP server instance.
  const server = new McpServer({
    // It's a good practice to name your server and provide a version.
    name: 'outsystems-generator',
    version: '1.0.0',
    // Declare the capabilities of the server.
    // In this case, we are only exposing tools.
    capabilities: {
      tools: {},
    },
  });

  // Initialize the tools and register them with the server.
  initializeTools(server);

  // Create a transport layer for the server.
  // StdioServerTransport is used for local communication over stdin/stdout.
  const transport = new StdioServerTransport();

  // Connect the server to the transport.
  await server.connect(transport);

  console.log('MCP server for OutSystems started and waiting for connections...');
}

// Start the server.
main().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
