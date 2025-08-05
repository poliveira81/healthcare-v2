import 'dotenv/config';
import readline from 'readline';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createOutSystemsAppTool } from './tools/outsystems-tool';
import fs from 'fs';

// Open log files in append mode
//const stderrLog = fs.createWriteStream('server_stderr.log', { flags: 'a' });
// Redirect stdout and stderr
//process.stderr.write = stderrLog.write.bind(stderrLog);

const tools = { [createOutSystemsAppTool.name]: createOutSystemsAppTool };

function writeResponse(id: number | string, result: any, error?: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result, error }) + '\n');
}

function writeNotification(method: string, params: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function safeExit(code: number = 0) {
  // Flush stdout, then stderr, then exit process
  process.stdout.write("", () => {
    process.stderr.write("", () => {
      process.exit(code);
    });
  });
}

async function handleRequest(request: any) {
  switch (request.method) {
    case 'initialize':
      const clientRequestedVersion = request.params?.protocolVersion || "2025-03-26";
      const clientName = request.params?.clientInfo?.name || "Unknown Client";
      console.error(`Client ${clientName} requested protocol version: ${clientRequestedVersion}. Agreeing to use it.`);

      writeResponse(request.id, {
        protocolVersion: clientRequestedVersion,
        serverInfo: {
          name: "outsystems-app-generator",
          displayName: "OutSystems App Generator",
          version: "2.0.0"
        },
        capabilities: {},
        tools: Object.values(tools).map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: zodToJsonSchema(tool.input_schema, { target: 'jsonSchema7' }),
        })),
      });
      break;

    case 'tool/execute':
      const { tool_name, input, executionId } = request.params;
      const tool = tools[tool_name];

      console.error("[DEBUG][tool/execute] input:", JSON.stringify(input));

      if (!tool) {
        writeResponse(request.id, null, { code: -32601, message: 'Tool not found' });
        return;
      }
      writeResponse(request.id, { executionId });
      try {
        const generator = tool.handler(input);
        for await (const update of generator) {
          writeNotification('tool/update', { executionId, update });
        }
        writeNotification('tool/update', { executionId, isDone: true });
      } catch (error: any) {
        writeNotification('tool/update', { executionId, error: error.message, isDone: true });
      }
      break;

    case 'shutdown':
    case 'exit':
      safeExit(0);
      break;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

console.error("Manual Stdio Server Initialized. Waiting for JSON-RPC messages...");

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
await handleRequest(request);
  } catch (e: any) {
    console.error(`Failed to process line: ${line}. Error: ${e.message}`);
  }
});