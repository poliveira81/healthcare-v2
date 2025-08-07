# OutSystems MCP Server

This is a Model Context Protocol (MCP) server that generates OutSystems applications from a text prompt. It is designed to be used with MCP clients like Raycast and Perplexity, or as a standalone HTTP API.

## Architecture

The server is built with TypeScript and uses the official `@modelcontextprotocol/sdk` for handling MCP communication. It exposes a single tool, `createOutSystemsApp`, which generates and deploys an OutSystems application from a prompt. The tool is implemented as an async generator, streaming progress updates to the client. All OutSystems API logic is modularized for maintainability.

## Project Structure

```text
.
├── .env.example
├── package.json
├── tsconfig.json
└── src/
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

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone [https://github.com/joaomflcarvalho/OutSystems-mcp-server.git](https://github.com/joaomflcarvalho/OutSystems-mcp-server.git)
    cd OutSystems-mcp-server
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

3.  Build the project:
    ```bash
    npm run build
    ```

### Running the Server

To start the MCP server (stdio mode, for Raycast/Perplexity):

```bash
npm start
```

This will compile the TypeScript code (if needed) and start the MCP server using stdio. The entry point is `dist/stdio-server.js`.

For local HTTP API testing (optional):

```bash
node dist/index.js
```

## OutSystems Configuration

**Best practice for Raycast and similar clients:**
Set your OutSystems credentials directly in the `env` section of your MCP server configuration.

### Required Environment Variables

-   `OS_HOSTNAME`: The full URL of your OutSystems Developer Cloud (ODC) portal (e.g., `your-org-name.outsystems.dev`)
-   `OS_USERNAME`: Your ODC account email/username
-   `OS_PASSWORD`: Your ODC account password
-   `OS_DEV_ENVID`: The UUID of your Dev environment stage (see below)

#### Finding your `OS_DEV_ENVID`

1.  Navigate to `https://<your-hostname>/apps` (e.g., `https://your-org-name.outsystems.dev/apps`).
2.  Click on any application to open its details.
3.  Look at the URL for a `stageid` parameter and copy its UUID value.

Example:
`stageid=f39f6d4d-439f-4776-b549-71e3ddd16522`

## MCP Client Configuration

### Raycast

Add (or update) your MCP server block in the Raycast `mcp-config.json` like this:

```json
{
  "mcpServers": {
    "outsystems-generator": {
      "command": "node",
      "args": [
        "/path/to/your/project/OutSystems-mcp-server/dist/stdio-server.js"
      ],
      "env": {
        "OS_HOSTNAME": "your-org-name.outsystems.dev",
        "OS_USERNAME": "your-email@example.com",
        "OS_PASSWORD": "your-secret-password",
        "OS_DEV_ENVID": "your-dev-envid-uuid"
      },
      "autoApprove": ["createOutSystemsApp"]
    }
  }
}
```

**Note:**
You do NOT need to use a local `.env` file when running under Raycast; all secrets and config can be passed directly with the `env` property.

### Example .env File (for local testing or other deployment)

If you want to test locally (outside of Raycast), create a `.env` file in your project root with the following content:

```bash
OS_HOSTNAME=your-org-name.outsystems.dev
OS_USERNAME=your-email@example.com
OS_PASSWORD=your-secret-password
OS_DEV_ENVID=your-dev-envid-uuid
```

Then run the server:

```bash
npm start
```

## Notes

-   Only one tool is currently exposed: `createOutSystemsApp`.
-   The codebase is modular and ready for additional tools or features.
-   Progress updates and final URLs are streamed to the client according to the MCP protocol.
-   You can still use a `.env` file for local testing; just make sure to load it with a library like `dotenv` at the top of your entry file.
