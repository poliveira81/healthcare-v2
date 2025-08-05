import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createOutSystemsAppTool } from './tools/outsystems-tool';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const tools = {
  [createOutSystemsAppTool.name]: createOutSystemsAppTool,
};

app.get('/tools', (req, res) => {
  const toolDefinitions = Object.values(tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.input_schema, { target: 'jsonSchema7' }),
  }));
  res.json(toolDefinitions);
});

// This endpoint is updated to send a more compliant SSE stream
app.post('/execute-tool', async (req, res) => {
  const { tool_name, input } = req.body;
  const tool = tools[tool_name];

  if (!tool) {
    return res.status(404).json({ error: `Tool '${tool_name}' not found.` });
  }

  // 1. Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 2. Helper function to write fully-compliant events
  let eventId = 0;
  const sendEvent = (eventType: string, data: object) => {
    res.write(`id: ${eventId++}\n`);
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const generator = tool.handler(input);

    for await (const update of generator) {
      sendEvent('update', { content: update });
    }
    sendEvent('done', { content: 'Process finished successfully.' });
  } catch (error: any) {
    sendEvent('error', { content: error.message });
  } finally {
    res.end();
  }
});

app.listen(port, () => {
  console.log(`MCP server is running on http://localhost:${port}`);
});