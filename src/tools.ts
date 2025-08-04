import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { stateMachine } from "./state.js";
import { generateApp, publishApp } from "./outsystems.js";

// Define the schemas for the tool inputs.
const GenerateSchema = z.object({
  prompt: z
    .string()
    .describe("The text prompt describing the OutSystems app to generate."),
});

const PublishSchema = z.object({
  appId: z
    .string()
    .describe("The ID of the generated OutSystems app to publish."),
});

/**
 * Initializes the tools and registers them with the MCP server.
 * @param server The MCP server instance.
 */
export function initializeTools(server: McpServer) {
  /**
   * Tool to generate an OutSystems application.
   * This is a long-running tool that handles the entire generation process.
   */
  server.tool(
    "generate_app",
    GenerateSchema.shape,
    async ({ prompt }: z.infer<typeof GenerateSchema>) => {
      if (stateMachine.currentState !== "idle") {
        return {
          content: [
            {
              type: "text",
              text: `A process is already running (state: ${stateMachine.currentState}). Please wait or reset.`,
            },
          ],
        };
      }

      stateMachine.transition("START_GENERATION");

      try {
        // generateApp is a long-running function that handles all internal polling.
        const appId = await generateApp(prompt);
        stateMachine.setData({ appId });

        return {
          content: [
            {
              type: "text",
              text: `App generation complete! The new App ID is: ${appId}. You can now run the publish_app tool.`,
            },
          ],
        };
      } catch (error) {
        const { error: errorMessage } = stateMachine.getData();
        return {
          content: [
            { type: "text", text: `App generation failed: ${errorMessage}` },
          ],
        };
      }
    }
  );

  /**
   * Tool to publish a generated OutSystems application.
   * This is a long-running tool that handles the entire publishing process.
   */
  server.tool(
    "publish_app",
    PublishSchema.shape,
    async ({ appId }: z.infer<typeof PublishSchema>) => {
      const currentState = stateMachine.currentState;
      const currentAppId = stateMachine.getData().appId;

      if (currentState !== "generation_complete") {
        return {
          content: [
            {
              type: "text",
              text: `Cannot publish. App must be in 'generation_complete' state, but is in '${currentState}'.`,
            },
          ],
        };
      }
      if (currentAppId !== appId) {
        return {
          content: [
            {
              type: "text",
              text: `The provided App ID (${appId}) does not match the generated one (${currentAppId}).`,
            },
          ],
        };
      }

      try {
        // publishApp is a long-running function that handles all internal polling.
        const appUrl = await publishApp(appId);
        stateMachine.setData({ appUrl });

        // The process is complete, so we reset the state machine for the next run.
        stateMachine.transition("RESET");

        return {
          content: [
            {
              type: "text",
              text: `App published successfully! The URL is: ${appUrl}`,
            },
          ],
        };
      } catch (error) {
        const { error: errorMessage } = stateMachine.getData();
        return {
          content: [
            { type: "text", text: `App publishing failed: ${errorMessage}` },
          ],
        };
      }
    }
  );

  /**
   * A utility tool to check the current state of the process.
   */
  server.tool("check_status", {}, async () => {
    const state = stateMachine.currentState;
    const data = stateMachine.getData();
    return {
      content: [
        {
          type: "text",
          text: `Current state: ${state}\nData: ${JSON.stringify(
            data,
            null,
            2
          )}`,
        },
      ],
    };
  });

  /**
   * A utility tool to reset the state machine if it gets stuck.
   */
  server.tool("reset_process", {}, async () => {
    stateMachine.transition("RESET");
    return {
      content: [
        {
          type: "text",
          text: `Process has been reset. Current state: ${stateMachine.currentState}`,
        },
      ],
    };
  });
}
