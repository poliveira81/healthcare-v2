// stdio-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAndDeployApp } from "./services/outsystems-api";
import { z } from "zod";
import "dotenv/config"; // Loads .env automatically (Node 20+ and dotenv 16+)
import dotenv from "dotenv";
import fs from "fs";

const errorLogStream = fs.createWriteStream(
  "/Users/joao.carvalho/Projects/outsystems-mcp-server/src/error.log",
  { flags: "a" }
);
process.stderr.write = errorLogStream.write.bind(errorLogStream);

dotenv.config();

console.error("Loaded OS_HOSTNAME:", process.env.OS_HOSTNAME);

// Inline or reuse your schema
export const inputSchemaShape = {
  prompt: z
    .string()
    .describe("A prompt with a detailed description of the application..."),
};

const server = new McpServer({
  name: "outsystems-app-generator",
  version: "2.0.0",
  instructions: "Creates and deploys OutSystems applications from prompts.",
});

export const inputSchema = z.object(inputSchemaShape);

// --- NEW IMPLEMENTATION: Streaming Progress + Final URL Response ---
server.tool(
  "createOutSystemsApp",
  "Creates and deploys a complete OutSystems application from a text prompt.",
  inputSchemaShape,
  async ({ prompt }, extra: any) => {
    let lastUrl: string | null = null;
    let lastText: string | null = null;
    if (extra.progress) {
      for await (const step of createAndDeployApp(prompt)) {
        lastText = step;
        // Find a URL in the step
        const urlMatch = step.match(/https:\/\/\S+/);
        if (urlMatch) {
          lastUrl = urlMatch[0];
        }
        extra.progress({ content: [{ type: "text", text: step }] });
        
        console.error("DEBUG: Progress message:", lastText);
        console.error("DEBUG: Last URL:", lastUrl);
      }
      if (
        lastUrl &&
        typeof lastUrl === "string" &&
        lastUrl.startsWith("http")
      ) {
        console.error("Final URL found:", lastUrl);
        console.error(
          "DEBUG: Final content block:",
          JSON.stringify({
            content: [
              { type: "text", text: "🎉 Application is Live at " + lastUrl },
              /*{
                type: "resource",
                resource: { uri: lastUrl, text: "Open Application" },
              },*/
            ],
          })
        );
        return {
          content: [
            { type: "text", text: "🎉 Application is Live at " + lastUrl },
            /*{
              type: "resource",
              resource: { uri: lastUrl, text: "Open Application" },
            },*/
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text:
                lastText ||
                "App creation completed, but URL extraction failed.",
            },
          ],
        };
      }
    } else {
      // fallback if extra.progress not present
      let finalMsg = "";
      for await (const step of createAndDeployApp(prompt)) {
        finalMsg = step;
        const urlMatch = step.match(/https:\/\/\S+/);
        if (urlMatch) lastUrl = urlMatch[0];
        console.error("DEBUG: Final message2 :", finalMsg);
        console.error("DEBUG: Last URL2:", lastUrl);
      }
      if (
        lastUrl &&
        typeof lastUrl === "string" &&
        lastUrl.startsWith("http")
      ) {
        console.error("Final URL found:", lastUrl);
        console.error(
          "DEBUG: Final content block:",
          JSON.stringify({
            content: [
              { type: "text", text: "🎉 Application is Live at " + lastUrl },
              /*{
                type: "resource",
                resource: { uri: lastUrl, text: "Open Application" },
              },*/
            ],
          })
        );
        return {
          content: [
            { type: "text", text: "🎉 Application is Live at " + lastUrl },
            /*{
              type: "resource",
              resource: { uri: lastUrl, text: "Open Application" },
            },*/
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text:
                finalMsg ||
                "App creation completed, but URL extraction failed.",
            },
          ],
        };
      }
    }
  }
);

const transport = new StdioServerTransport();
server.connect(transport);

console.error(
  "MCP SDK stdio server initialized. Waiting for JSON-RPC messages..."
);
