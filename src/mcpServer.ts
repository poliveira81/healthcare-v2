// This MCP server implements the JSON-RPC protocol over stdio and does NOT expose any HTTP/SSE endpoints.
// MCP clients that require SSE (Server Sent Events) for communication are not supported.
// See OutSystems MCP Server docs for protocol compatibility notes.

import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import {
  createAppGenerationJob,
  getJobStatus,
  startAppGeneration,
} from './mentor';


const connection = createMessageConnection(
  new StreamMessageReader(process.stdin),
  new StreamMessageWriter(process.stdout)
);

console.log('MCP server process started');  // Log immediately on process start

// Handle initialize
connection.onRequest('initialize', () => {
  console.log('Received initialize request');
  return {
    capabilities: {
      tools: {
        generateOutsystemsApp: {
          description: 'Generate an OutSystems App from a prompt and optional files',
          parameters: {
            prompt: { type: 'string', description: 'Text description of the app to generate' },
            files: { type: 'array', items: { type: 'object' }, optional: true, description: 'Optional array of file objects' },
            ignoreTenantContext: { type: 'boolean', optional: true }
          }
        },
        getOutsystemsJobStatus: {
          description: 'Get status of an app generation job',
          parameters: {
            jobId: { type: 'string', description: 'Job UUID' }
          }
        },
        startOutsystemsAppGeneration: {
          description: 'Start app generation for a job',
          parameters: {
            jobId: { type: 'string', description: 'Job UUID' }
          }
        }
      }
    },
    serverInfo: { name: 'outsystems-mcp', version: '1.0.0' }
  };
});

// Tool: generateOutsystemsApp
connection.onRequest('tool/generateOutsystemsApp', async (params) => {
  console.log('Received generateOutsystemsApp:', params);
  try {
    const { prompt, files, ignoreTenantContext } = params;
    const job = await createAppGenerationJob(prompt, files || [], ignoreTenantContext ?? true);
    console.log('Returning job:', job);
    return { success: true, job };
  } catch (error: any) {
    console.error('Error in generateOutsystemsApp:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Tool: getOutsystemsJobStatus
connection.onRequest('tool/getOutsystemsJobStatus', async (params) => {
  console.log('Received getOutsystemsJobStatus:', params);
  try {
    const status = await getJobStatus(params.jobId);
    console.log('Returning status:', status);
    return { success: true, status };
  } catch (error: any) {
    console.error('Error in getOutsystemsJobStatus:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Tool: startOutsystemsAppGeneration
connection.onRequest('tool/startOutsystemsAppGeneration', async (params) => {
  console.log('Received startOutsystemsAppGeneration:', params);
  try {
    const result = await startAppGeneration(params.jobId);
    console.log('Returning result:', result);
    return { success: true, result };
  } catch (error: any) {
    console.error('Error in startOutsystemsAppGeneration:', error);
    return { success: false, error: error.message || String(error) };
  }
});

connection.listen();
console.log('MCP server is listening for requests');
