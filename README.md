# OutSystems MCP Server

This project is a Model Context Protocol (MCP) server that calls OutSystems Mentor to generate OutSystems apps from anywhere.

## Features
- REST API to interact with OutSystems Mentor
- Generate OutSystems apps via API
- TypeScript/Node.js backend

## Requirements

- Node.js 18.x or newer
- An OutSystems Cloud Environment ([sign up here](https://www.outsystems.com/Platform/Signup))

### Configuration

To use this MCP server, you must provide your OutSystems environment credentials.  
**If you do not have an OutSystems environment**, sign up for a free one at [https://www.outsystems.com/Platform/Signup](https://www.outsystems.com/Platform/Signup)[2].

After signing up, create a file named `config.json` in the project root with the following content:

```json
{
  "hostname": "your-environment.outsystemscloud.com",
  "username": "your.username@outsystems.com",
  "password": "your-env-password"
}
```

> **Note:**  
> The **hostname** must be the URL of your OutSystems Developer Cloud (ODC) portal, and **it should end with `.dev`** (e.g., `your-org-id.odc.dev`).  
> If you are using ODC, you can find this in your OutSystems portal address bar.

Replace each field with your actual OutSystems environment details.

> **Warning:** Protect your `config.json`—never commit it to version control!

You must have a valid OutSystems environment and user credentials to use this MCP server.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Run tests:
   ```bash
   npm test
   ```

## Configuration
Edit `config/default.json` to set the Mentor API URL and server port.

## Folder Structure
- `src/` - Source code
- `config/` - Configuration files
- `test/` - Tests
- `docs/` - Documentation
- `scripts/` - Utility scripts

## License
MIT
