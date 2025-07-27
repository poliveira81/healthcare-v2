import { spawn, ChildProcess } from 'child_process';
import { createMessageConnection, MessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import * as path from 'path';

// Helper function to add a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main function to run the MCP client, test the server, and generate an app.
 */
async function main() {
    // 1. Get the user's prompt from the command-line arguments.
    const userPrompt = process.argv.slice(2).join(' ');
    if (!userPrompt) {
        console.error('Error: No prompt provided.');
        console.error('Usage: npx ts-node src/client.ts "Your application prompt"');
        process.exit(1);
    }

    console.log(`🚀 Starting app generation for prompt: "${userPrompt}"`);

    // 2. Spawn the MCP server as a child process.
    // This is how the client and server will communicate.
    const serverPath = path.join(__dirname, '../dist/src/mcpServer.js');
    console.log(`\nSpawning server from: ${serverPath}`);
    const serverProcess: ChildProcess = spawn('node', [serverPath]);

    if (!serverProcess.stdout || !serverProcess.stdin) {
        throw new Error('Server process stdio streams are not available.');
    }

    // Create a connection over the child process's stdio streams.
    const connection: MessageConnection = createMessageConnection(
        new StreamMessageReader(serverProcess.stdout),
        new StreamMessageWriter(serverProcess.stdin)
    );

    // Pipe the server's logs to our main console for visibility.
    if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER LOG]: ${data.toString().trim()}`);
    });
    } else {
        console.warn('No stderr stream available on serverProcess.');
    }

    try {
        // Activate the connection.
        connection.listen();
        console.log('✅ Client connected to server process.');

        // Step 1: Start the application generation job.
        console.log('\n1️⃣  Requesting to start the application generation job...');
        const startResult = await connection.sendRequest<{ jobId: string }>('tool/startOutsystemsAppGeneration', { prompt: userPrompt });
        const jobId = startResult?.jobId;

        if (!jobId) {
            throw new Error('Failed to start job or did not receive a job ID.');
        }
        console.log(`   ✔️ Job started successfully. Job ID: ${jobId}`);

        // Step 2: Poll for job status until it's ready.
        console.log('\n2️⃣  Polling for job status (checking every 10 seconds)...');
        let isReadyForGeneration = false;
        while (!isReadyForGeneration) {
            const statusResult = await connection.sendRequest<{ status: string }>('tool/getOutsystemsJobStatus', { jobId });
            const status = statusResult?.status;

            console.log(`   - Current status: ${status}`);

            if (status === 'READY_FOR_GENERATION') {
                isReadyForGeneration = true;
                console.log('   ✔️ Job is ready for final generation!');
                break;
            } else if (status === 'FAILED' || status === 'COMPLETED_WITH_ERROR') {
                throw new Error(`Job entered a failed state: ${status}`);
            }

            await delay(10000); // Wait for 10 seconds before checking again.
        }

        // Step 3: Trigger the final application generation.
        console.log('\n3️⃣  Triggering final application generation...');
        const generateResult = await connection.sendRequest<any>('tool/generateOutsystemsApp', { jobId });

        console.log('\n🎉 Generation Complete! Final Result:');
        console.log(JSON.stringify(generateResult, null, 2));

    } catch (error) {
        console.error('\n❌ An error occurred during the process:', error);
    } finally {
        // 4. Clean up and shut down the server process.
        console.log('\n🔌 Shutting down server process.');
        connection.dispose();
        serverProcess.kill();
    }
}

// Run the main function.
main();
