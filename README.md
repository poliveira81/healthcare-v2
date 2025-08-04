<!-- README.md -->

# MCP Server for OutSystems App Generation

This is a Model Context Protocol (MCP) server that generates OutSystems applications from a text prompt. It is designed to be used with MCP clients like Raycast and Perplexity.

## Architecture

The server is built with TypeScript and uses the official `@modelcontextprotocol/sdk` for handling the MCP communication. It exposes a series of tools that must be executed sequentially to generate an OutSystems app. A state machine is used to manage the state of the generation process and ensure that the tools are called in the correct order.

## Project Structure

```
.
├── .env.example
├── package.json
├── tsconfig.json
└── src
    ├── outsystems.ts
    ├── server.ts
    ├── state.ts
    └── tools.ts
```

-   `src/server.ts`: The main entry point for the server. It initializes the MCP server, sets up the transport layer, and registers the tools.
-   `src/tools.ts`: Defines the tools that are exposed by the server. Each tool corresponds to a step in the OutSystems app generation process.
-   `src/outsystems.ts`: Contains the logic for interacting with the OutSystems platform. This is where you will implement the code to generate the app.
-   `src/state.ts`: Implements the state machine that manages the app generation process.
-   `.env.example`: An example environment file. You should copy this to `.env` and fill in your OutSystems credentials.

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm

### Installation

1.  Clone the repository:

    ```bash
    git clone <your-repo-url>
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

To build and run the server, use the following command:

```bash
npm start
```

This will compile the TypeScript code and start the MCP server.

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
      "args": ["/path/to/your/project/mcp-outsystems-server/build/server.js"]
    }
  }
}
```
*Note: The server reads credentials from the `.env` file, so they don't need to be specified in the Raycast configuration.*

### Perplexity

For Perplexity and other clients, you will need to provide the command to start the server. The configuration will be similar to the Raycast example above.
