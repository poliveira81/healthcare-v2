const { spawn } = require("child_process");

const server = spawn("node", ["./dist/stdio-server.js"]); // adjust path and command as needed

// Log child process output (responses from server)
server.stdout.on("data", (data: Buffer) => {
  console.log("[SERVER STDOUT]", data.toString());
});

server.stderr.on("data", (data: Buffer) => {
  console.error("[SERVER STDERR]", data.toString());
});

server.on("close", (code: Buffer) => {
  console.log(`[SERVER EXITED] code: ${code}`);
});

server.on("error", (err: Buffer) => {
  console.error("[PROCESS ERROR]", err);
});

// Compose and send the initialize request
const initializeMsg = {
  jsonrpc: "2.0",
  id: 0,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "debug-script", version: "1.0.0" },
  },
};

console.log("[CLIENT]", "Sending initialize:", JSON.stringify(initializeMsg));
server.stdin.write(JSON.stringify(initializeMsg) + "\n");
