# OutSystems MCP Server

This project provides a local MCP (Model Context Protocol) server that allows an LLM-based client, like Perplexity, to interact with the OutSystems platform. It exposes tools to create, monitor, and generate applications within an OutSystems Developer Cloud (ODC) portal.

## Configuration

To use this MCP server, you must provide your OutSystems environment credentials. If you do not have an OutSystems environment, sign up for a free one at [https://www.outsystems.com/Platform/Signup](https://www.outsystems.com/Platform/Signup).

Once you have your credentials, you must configure them in the `src/config.ts` file. Open the file and set the following variables:

* `OS_HOSTNAME`: The URL of your OutSystems Developer Cloud (ODC) portal. **Note:** This should be the full hostname, for example: `your-org-name.outsystems.dev`.
* `OS_USERNAME`: The username for your ODC account.
* `OS_PASSWORD`: The password for your ODC account.
* `OS_DEV_ENVID`: The stageid key for your dev env where the app is going to be created.

```typescript
// src/config.ts
export const OS_HOSTNAME = 'your-org-name.outsystems.dev';
export const OS_USERNAME = 'your-email@example.com';
export const OS_PASSWORD = 'your-secret-password';
export const OS_DEV_ENVID = 'youdev-env-stageid-uuid-key';
```

## Getting Started

Follow these steps to get the server running.

### 1. Install Dependencies

First, install the required Node.js packages:

```bash
npm install
```

### 2. Build the Project

This project uses TypeScript. You must compile the TypeScript code into JavaScript before running the server. The build process creates a `dist` folder containing the compiled output.

```bash
npm run build
```

### 3. Run the Server

Once the project is built, you can run the MCP server. To test it locally and see the logs, you can run the compiled file directly with Node.js:

```bash
node dist/src/mcpServer.js
```

You should see output in your terminal indicating that the server has started, initialized the connection listener, and successfully pre-warmed the authentication token cache.

### 4. Configure in Perplexity

To connect the server to Perplexity, you need to configure it in the application's settings.

* **Command**: `node`
* **Args**: `[Absolute path to your compiled mcpServer.js file]`

For example:

```json
{
  "args" : [
    "/Users/your-username/Projects/outsystems-mcp-server/dist/mcpServer.js"
  ],
  "command" : "node",
  "env" : {}
}
```

### 5. Run the Test Client (Optional)

To test the entire workflow from your terminal, you can use the command-line client located at `test/client.ts`. This script will spawn the server, send a prompt, and display the step-by-step progress of the app generation. This is a great way to verify the server is working correctly or to record a demo.

To run the client, execute the following command in your terminal, replacing the example prompt with your own:

```bash
npx ts-node test/client.ts "Generate an OutSystems app that tracks employee tasks."
```

You will see a live log of the client connecting to the server, starting the job, polling for status, and completing the generation.

## Available Tools

The MCP server exposes the following tools that can be called from a connected client:

* **`tool/startOutsystemsAppGeneration`**: Creates a new application generation job.
    * **Parameters**: `prompt` (string)
* **`tool/getOutsystemsJobStatus`**: Checks the status of an ongoing generation job.
    * **Parameters**: `jobId` (string)
* **`tool/generateOutsystemsApp`**: Triggers the final application generation for a created job.
    * **Parameters**: `jobId` (string)