// stdio-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAndDeployApp } from "./services/outsystems-api";
import { z } from "zod";

// Define input schema inline or re-use your tool's definition
export const inputSchemaShape = {
    prompt: z.string().describe("A prompt with a detailed description of the application..."),
};

const server = new McpServer({
  name: "outsystems-app-generator",
  version: "2.0.0",
  instructions: "Creates and deploys OutSystems applications from prompts.",
});

// Optionally, keep your Zod schema for validation elsewhere:
export const inputSchema = z.object(inputSchemaShape);

// ✅ Passes the raw shape, which is exactly what the SDK expects:
server.tool(
  "createOutSystemsApp",
  "Creates and deploys a complete OutSystems application from a text prompt.",
  inputSchemaShape,
  async ({ prompt }) => {
    const result = await createAndDeployApp(prompt);
    return {
      content: [
        { type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }
      ]
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);

console.error("MCP SDK stdio server initialized. Waiting for JSON-RPC messages...");
