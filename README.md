<!-- README.md -->


# OutSystems MCP Server

This is a Model Context Protocol (MCP) server that generates OutSystems applications from a text prompt. It is designed to be used with MCP clients like Raycast and Perplexity, or as a standalone HTTP API.


## Architecture

The server is built with TypeScript and uses the official `@modelcontextprotocol/sdk` for handling MCP communication. It exposes a single tool, `createOutSystemsApp`, which generates and deploys an OutSystems application from a prompt. The tool is implemented as an async generator, streaming progress updates to the client. All OutSystems API logic is modularized for maintainability.


## Project Structure

```
.
├── .env.example
├── package.json
├── tsconfig.json
└── src
    ├── stdio-server.ts         # Main MCP stdio server entry point
    ├── index.ts                # Optional HTTP API server (for testing/dev)
    ├── tools/
    │   └── outsystems-tool.ts  # MCP tool definition
    ├── services/
    │   ├── outsystems-api.ts   # OutSystems API logic
    │   └── token-manager.ts    # Token management
    └── utils/
        └── getOutsystemsToken.ts # Token utility
```

- `src/stdio-server.ts`: Main entry point for the MCP server (used by Raycast/Perplexity). Handles stdio transport and tool registration.
- `src/index.ts`: Optional HTTP API server for local testing or integration.
- `src/tools/outsystems-tool.ts`: Defines the `createOutSystemsApp` tool.
- `src/services/outsystems-api.ts`: Contains the logic for interacting with the OutSystems platform.
- `src/services/token-manager.ts`: Handles OutSystems API token caching and refresh.
- `.env.example`: Example environment file. Copy to `.env` and fill in your OutSystems credentials.

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/joao-carvalho-OutSystems/OutSystems-mcp-server.git
    cd mcp-outsystems-server
    ```

2.  Install the dependencies:

    ```bash
    npm install
    ```

3.  Create a `.env` file from the example:

    ```bash
    cp .env.example .env
    ```

4.  Add your OutSystems credentials to the `.env` file. See the "OutSystems Configuration" section for details on how to find these values.


### Running the Server

To build and run the MCP server (stdio mode, for Raycast/Perplexity):

```bash
npm install
npm run build
npm start
```

This will compile the TypeScript code and start the MCP server using stdio. The entry point is `dist/stdio-server.js`.

For local HTTP API testing (optional):

```bash
npm run build
node dist/index.js
```

## OutSystems Configuration

To use this MCP server, you must provide your OutSystems environment credentials. If you do not have an OutSystems environment, sign up for a free one at [https://www.outsystems.com/Platform/Signup](https://www.outsystems.com/Platform/Signup).

Once you have your credentials, you must configure them in the `.env` file. Open the file and set the following variables:

-   **OS_HOSTNAME**: The URL of your OutSystems Developer Cloud (ODC) portal. **Note**: This should be the full hostname, for example: `your-org-name.outsystems.dev`.
-   **OS_USERNAME**: The username for your ODC account.
-   **OS_PASSWORD**: The password for your ODC account.
-   **OS_DEV_ENVID**: The stageid key for your dev env where the app is going to be created.

#### Finding your `OS_DEV_ENVID`

You can find this key by navigating to the ODC Portal for your environment.

1.  Go to `https://<your-hostname>/apps` (e.g., `https://your-org-name.outsystems.dev/apps`).
2.  Click on any existing application to view its details.
3.  Look at the URL in your browser's address bar.
4.  Find the `stageid` parameter and copy its value (the UUID).

For example, in the URL: `.../stageid=f39f6d4d-439f-4776-b549-71e3ddd16522`

The `OS_DEV_ENVID` would be `f39f6d4d-439f-4776-b549-71e3ddd16522`.

## MCP Client Configuration

To use the server with an MCP client, you will need to configure it in the client's settings.

### Raycast

In Raycast, you can add the server using the following configuration in your `mcp-config.json` file:


```json
{
  "mcpServers": {
    "outsystems-generator": {
      "command": "node",
      "args": ["/path/to/your/project/outsystems-mcp-server/dist/stdio-server.js"]
    }
  }
}
```

*Note: The server reads credentials from the `.env` file, so they don't need to be specified in the Raycast configuration.*

### Perplexity


For Perplexity and other clients, provide the command to start the server as in the Raycast example above.
## Notes

- Only one tool is currently exposed: `createOutSystemsApp`.
- The codebase is modular and ready for additional tools or features if needed.
- There is no explicit state machine module; the async generator in the tool handles progress and state.
